import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, editorId } = await req.json() as { action: string; editorId?: string }
  const svc = createServiceClient()

  if (action === 'assign' && editorId) {
    await svc.from('orders').update({ editor_id: editorId, status: 'em_edicao' }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'mark_urgent') {
    await svc.from('orders').update({ is_urgent: true }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'pause') {
    await svc.from('orders').update({ status: 'pausado', paused_at: new Date().toISOString() }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'resume') {
    await svc.from('orders').update({ status: 'aguardando', paused_at: null }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
