import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videos } = await req.json()
  // videos: Array<{ filename, r2Key, contentType, size, briefing }>

  const createdOrders = []

  for (const video of videos) {
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: user.id,
        briefing: video.briefing,
        status: 'aguardando',
      })
      .select()
      .single()

    if (orderError || !order) continue

    // Create video record
    await supabase.from('videos').insert({
      order_id: order.id,
      r2_key: video.r2Key,
      filename: video.filename,
      content_type: video.contentType,
      size_bytes: video.size,
    })

    createdOrders.push(order)
  }

  return NextResponse.json({ orders: createdOrders })
}
