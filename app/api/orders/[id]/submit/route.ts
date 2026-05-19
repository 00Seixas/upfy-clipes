import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { r2Key, filename, viralityGrade, feedback } = await req.json()

  // Get the client_id from the order
  const { data: order } = await supabase
    .from('orders')
    .select('client_id')
    .eq('id', params.id)
    .eq('editor_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Calculate next clip_number for this client (sequential across contract)
  // First get all order IDs for this client, then count deliverables
  const { data: clientOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('client_id', order.client_id)

  const orderIds = clientOrders?.map(o => o.id) ?? []

  const { count } = orderIds.length
    ? await supabase
        .from('deliverables')
        .select('*', { count: 'exact', head: true })
        .in('order_id', orderIds)
    : { count: 0 }

  const clipNumber = (count ?? 0) + 1

  // Create deliverable
  const { error: deliverableError } = await supabase.from('deliverables').insert({
    order_id: params.id,
    editor_id: user.id,
    r2_key: r2Key,
    filename,
    clip_number: clipNumber,
    virality_grade: viralityGrade,
    feedback,
    delivered_at: new Date().toISOString(),
  })

  if (deliverableError) return NextResponse.json({ error: deliverableError.message }, { status: 400 })

  // Update order status
  await supabase.from('orders').update({ status: 'aprovacao' }).eq('id', params.id)

  return NextResponse.json({ ok: true, clipNumber })
}
