import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logOrderAction } from '@/lib/services/audit'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = [
  'aguardando', 'em_analise', 'na_fila', 'atribuido', 'em_edicao',
  'revisao_interna', 'pronto', 'revisao_solicitada', 'aprovacao',
  'entregue', 'publicado', 'cancelado', 'falhou', 'pausado',
]

const VALID_PRIORITIES = ['low', 'normal', 'high', 'critical']

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (actorProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orderId    = params.id
  const body       = await req.json()
  const { action, data: actionData = {} } = body as { action: string; data?: Record<string, unknown> }

  const svc = createServiceClient()

  // Fetch current order for before state
  const { data: currentOrder, error: fetchErr } = await svc
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchErr || !currentOrder) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  const actorName = (actorProfile as { name: string }).name ?? 'Admin'
  const actorRole = 'admin'

  let update: Record<string, unknown> = {}
  let logAction = action
  let logMeta: Record<string, unknown> = {}

  switch (action) {
    case 'assign_editor': {
      const editorId = actionData.editorId as string
      if (!editorId) return NextResponse.json({ error: 'editorId required' }, { status: 400 })

      // Verify editor exists
      const { data: editor } = await svc.from('profiles').select('name, role').eq('id', editorId).single()
      if (!editor || editor.role !== 'editor') {
        return NextResponse.json({ error: 'Editor não encontrado' }, { status: 400 })
      }

      update = { editor_id: editorId, status: 'atribuido' }
      logAction = 'order.assigned'
      logMeta = { editor_id: editorId, editor_name: editor.name }
      break
    }

    case 'unassign_editor': {
      update = { editor_id: null, status: 'na_fila' }
      logAction = 'order.unassigned'
      break
    }

    case 'mark_urgent': {
      update = { is_urgent: true }
      logAction = 'order.marked_urgent'
      break
    }

    case 'unmark_urgent': {
      update = { is_urgent: false }
      logAction = 'order.unmarked_urgent'
      break
    }

    case 'set_priority': {
      const priority = actionData.priority as string
      if (!VALID_PRIORITIES.includes(priority)) {
        return NextResponse.json({ error: 'Prioridade inválida' }, { status: 400 })
      }
      update = { priority }
      logAction = 'order.priority_changed'
      logMeta = { from: currentOrder.priority, to: priority }
      break
    }

    case 'set_status': {
      const status = actionData.status as string
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      }
      update = { status }
      logAction = 'order.status_changed'
      logMeta = { from: currentOrder.status, to: status, reason: actionData.reason }
      break
    }

    case 'pause': {
      update = { status: 'pausado', paused_at: new Date().toISOString() }
      logAction = 'order.paused'
      break
    }

    case 'resume': {
      // Return to previous active status
      const prevStatus = currentOrder.editor_id ? 'em_edicao' : 'na_fila'
      update = { status: prevStatus, paused_at: null }
      logAction = 'order.resumed'
      break
    }

    case 'cancel': {
      update = {
        status:      'cancelado',
        canceled_at: new Date().toISOString(),
      }
      logAction = 'order.canceled'
      logMeta = { reason: actionData.reason }
      break
    }

    case 'add_note': {
      const note = actionData.note as string
      if (!note?.trim()) return NextResponse.json({ error: 'Nota não pode ser vazia' }, { status: 400 })
      update = { internal_notes: note.trim() }
      logAction = 'order.note_added'
      break
    }

    default:
      return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
  }

  // Apply update
  const { error: updateErr } = await svc
    .from('orders')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 })
  }

  // Audit log (non-blocking)
  await logOrderAction({
    actorId:   user.id,
    actorName,
    actorRole,
    orderId,
    action:    logAction,
    before:    { status: currentOrder.status, editor_id: currentOrder.editor_id, priority: currentOrder.priority },
    after:     update,
    metadata:  logMeta,
  })

  return NextResponse.json({ ok: true })
}
