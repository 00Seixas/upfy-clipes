import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clipId, platform, caption } = await req.json() as { clipId: string; platform: string; caption: string }

  // Get clip + r2_key
  const { data: clip } = await supabase.from('deliverables').select('id, r2_key, clip_number, order_id').eq('id', clipId).single()
  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  // Verify clip belongs to this user
  const { data: order } = await supabase.from('orders').select('client_id').eq('id', clip.order_id).single()
  if (!order || order.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get social connection
  const { data: conn } = await supabase.from('social_connections').select('access_token, platform_user_id').eq('user_id', user.id).eq('platform', platform).single()
  if (!conn) return NextResponse.json({ error: 'Platform not connected' }, { status: 400 })

  const publicR2Url = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? ''
  const videoUrl = `${publicR2Url}/${clip.r2_key}`
  const finalCaption = caption || `Clipe #${clip.clip_number} 🎬`

  if (platform === 'tiktok') {
    // TikTok Content Posting API v2 - Pull from URL
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: { title: finalCaption, privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      }),
    })
    const initData = await initRes.json() as { error?: { code?: string; message?: string }; data?: { publish_id?: string } }
    if (initData.error?.code && initData.error.code !== 'ok') {
      return NextResponse.json({ error: initData.error.message ?? 'TikTok error' }, { status: 400 })
    }
    return NextResponse.json({ success: true, platform: 'tiktok', publish_id: initData.data?.publish_id })
  }

  if (platform === 'instagram') {
    const igUserId = conn.platform_user_id
    if (!igUserId) return NextResponse.json({ error: 'Instagram account not found' }, { status: 400 })

    // Create media container (Reel)
    const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption: finalCaption, share_to_feed: true, access_token: conn.access_token }),
    })
    const mediaData = await mediaRes.json() as { id?: string; error?: { message?: string } }
    if (!mediaData.id) return NextResponse.json({ error: mediaData.error?.message ?? 'Instagram error' }, { status: 400 })

    // Poll for processing (wait up to 30s)
    let ready = false
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const statusRes = await fetch(`https://graph.facebook.com/v19.0/${mediaData.id}?fields=status_code&access_token=${conn.access_token}`)
      const statusData = await statusRes.json() as { status_code?: string }
      if (statusData.status_code === 'FINISHED') { ready = true; break }
      if (statusData.status_code === 'ERROR') return NextResponse.json({ error: 'Instagram processing failed' }, { status: 400 })
    }
    if (!ready) return NextResponse.json({ error: 'Instagram processing timeout — try again in a moment' }, { status: 408 })

    // Publish
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: mediaData.id, access_token: conn.access_token }),
    })
    const publishData = await publishRes.json() as { id?: string; error?: { message?: string } }
    if (!publishData.id) return NextResponse.json({ error: publishData.error?.message ?? 'Publish failed' }, { status: 400 })

    return NextResponse.json({ success: true, platform: 'instagram', post_id: publishData.id })
  }

  return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
}
