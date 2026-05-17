import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { notes } = await req.json()
  if (!notes?.trim()) return NextResponse.json({ error: 'Notas são obrigatórias' }, { status: 400 })

  const svc = createServiceClient()

  // Get current briefing — order must be in 'aprovacao'
  const { data: order } = await svc
    .from('orders')
    .select('briefing')
    .eq('id', params.id)
    .eq('status', 'aprovacao')
    .single()

  if (!order) {
    return NextResponse.json(
      { error: 'Pedido não encontrado ou não está em aprovação' },
      { status: 404 }
    )
  }

  // Merge revision notes into briefing JSONB (no schema migration needed)
  const updatedBriefing = {
    ...(order.briefing as Record<string, unknown>),
    _revision_notes: notes.trim(),
    _revision_at: new Date().toISOString(),
  }

  const { error } = await svc
    .from('orders')
    .update({
      status: 'em_edicao',           // valid in old constraint
      briefing: updatedBriefing,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
