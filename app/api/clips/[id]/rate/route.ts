import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rating } = await req.json() as { rating: unknown }
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }

  const { data: clip } = await supabase
    .from('deliverables')
    .select('id, order_id')
    .eq('id', params.id)
    .single()
  if (!clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: order } = await supabase
    .from('orders')
    .select('client_id')
    .eq('id', clip.order_id)
    .single()
  if (!order || order.client_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase
    .from('deliverables')
    .update({ client_rating: rating, client_rating_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ success: true })
}
