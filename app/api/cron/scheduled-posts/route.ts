import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Called by Vercel cron — processes pending scheduled posts
export async function GET(req: NextRequest) {
  // Basic auth check for cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch all pending posts where scheduled_at is now or past
  const { data: duePosts, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select(`
      id,
      user_id,
      deliverable_id,
      platform,
      caption,
      deliverables(id, r2_key, clip_number, order_id)
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const results: Array<{ id: string; status: 'posted' | 'failed'; error?: string }> = []

  for (const post of duePosts) {
    const deliverable = Array.isArray(post.deliverables) ? post.deliverables[0] : post.deliverables
    if (!deliverable) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error: 'Deliverable not found' })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'failed', error: 'Deliverable not found' })
      continue
    }

    // Get the user's social connection
    const { data: conn } = await supabase
      .from('social_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', post.user_id)
      .eq('platform', post.platform)
      .single()

    if (!conn) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error: 'Platform not connected' })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'failed', error: 'Platform not connected' })
      continue
    }

    const publicR2Url = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? ''
    const videoUrl = `${publicR2Url}/${deliverable.r2_key}`
    const caption = post.caption || `Clipe #${deliverable.clip_number} 🎬`

    try {
      if (post.platform === 'tiktok') {
        const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${conn.access_token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({
            post_info: {
              title: caption,
              privacy_level: 'PUBLIC_TO_EVERYONE',
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
          }),
        })
        const initData = await initRes.json() as { error?: { code?: string; message?: string }; data?: { publish_id?: string } }
        if (initData.error?.code && initData.error.code !== 'ok') {
          throw new Error(initData.error.message ?? 'TikTok error')
        }
        await supabase
          .from('scheduled_posts')
          .update({ status: 'posted', posted_at: new Date().toISOString() })
          .eq('id', post.id)
        results.push({ id: post.id, status: 'posted' })

      } else if (post.platform === 'instagram') {
        const igUserId = conn.platform_user_id
        if (!igUserId) throw new Error('Instagram account not found')

        const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'REELS',
            video_url: videoUrl,
            caption,
            share_to_feed: true,
            access_token: conn.access_token,
          }),
        })
        const mediaData = await mediaRes.json() as { id?: string; error?: { message?: string } }
        if (!mediaData.id) throw new Error(mediaData.error?.message ?? 'Instagram create container error')

        // Poll for processing (up to 30s)
        let ready = false
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 5000))
          const statusRes = await fetch(`https://graph.facebook.com/v19.0/${mediaData.id}?fields=status_code&access_token=${conn.access_token}`)
          const statusData = await statusRes.json() as { status_code?: string }
          if (statusData.status_code === 'FINISHED') { ready = true; break }
          if (statusData.status_code === 'ERROR') throw new Error('Instagram processing failed')
        }
        if (!ready) throw new Error('Instagram processing timeout')

        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: mediaData.id, access_token: conn.access_token }),
        })
        const publishData = await publishRes.json() as { id?: string; error?: { message?: string } }
        if (!publishData.id) throw new Error(publishData.error?.message ?? 'Publish failed')

        await supabase
          .from('scheduled_posts')
          .update({ status: 'posted', posted_at: new Date().toISOString() })
          .eq('id', post.id)
        results.push({ id: post.id, status: 'posted' })
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error: errMsg })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'failed', error: errMsg })
    }
  }

  const posted = results.filter(r => r.status === 'posted').length
  const failed = results.filter(r => r.status === 'failed').length

  return NextResponse.json({ processed: results.length, posted, failed, results })
}
