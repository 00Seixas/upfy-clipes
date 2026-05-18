import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deliverableId, platform, scheduledAt, caption } = await req.json() as {
    deliverableId: string
    platform: string
    scheduledAt: string
    caption?: string
  }

  if (!deliverableId || !platform || !scheduledAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['tiktok', 'instagram'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  // Verify ownership of the deliverable
  const { data: clip } = await supabase
    .from('deliverables')
    .select('id, order_id')
    .eq('id', deliverableId)
    .not('client_approved_at', 'is', null)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found or not yet approved' }, { status: 404 })

  const { data: order } = await supabase
    .from('orders')
    .select('client_id')
    .eq('id', clip.order_id)
    .single()

  if (!order || order.client_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Insert scheduled post
  const { data: scheduled, error } = await supabase
    .from('scheduled_posts')
    .insert({
      user_id: user.id,
      deliverable_id: deliverableId,
      platform,
      scheduled_at: scheduledAt,
      caption: caption ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: scheduled.id })
}

export async function GET(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('scheduled_posts')
    .select(`
      id,
      platform,
      scheduled_at,
      caption,
      status,
      posted_at,
      error,
      created_at,
      deliverable_id,
      deliverables(clip_number)
    `)
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
