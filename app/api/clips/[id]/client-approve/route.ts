import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: clip } = await supabase.from('deliverables').select('id, order_id').eq('id', params.id).single()
  if (!clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: order } = await supabase.from('orders').select('client_id').eq('id', clip.order_id).single()
  if (!order || order.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('deliverables').update({ client_approved_at: new Date().toISOString() }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
