import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const svc = createServiceClient()

  const TERMINAL = ['entregue', 'publicado', 'cancelado', 'falhou']
  const EDITING   = ['em_edicao', 'atribuido']
  const REVIEW    = ['revisao_interna', 'revisao_solicitada', 'aprovacao']

  // Run queries in parallel
  const [
    activeRes,
    editingRes,
    reviewRes,
    revisionRes,
    deliveredTodayRes,
    clientsRes,
    editorsRes,
    onlineEditorsRes,
    allOrdersRes,
    recentLogsRes,
  ] = await Promise.all([
    svc.from('orders').select('id', { count: 'exact', head: true }).not('status', 'in', `(${TERMINAL.join(',')})`),
    svc.from('orders').select('id', { count: 'exact', head: true }).in('status', EDITING),
    svc.from('orders').select('id', { count: 'exact', head: true }).in('status', REVIEW),
    svc.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'revisao_solicitada'),
    svc.from('orders').select('id', { count: 'exact', head: true })
      .eq('status', 'entregue')
      .gte('updated_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    svc.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'cliente'),
    svc.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'editor'),
    svc.from('orders').select('editor_id', { count: 'exact' }).in('status', EDITING),
    // Critical orders: urgent OR revision OR overdue
    svc.from('orders')
      .select('id, status, is_urgent, is_vip, priority, created_at, sla_hours, clips_requested, profiles:profiles!client_id(name), editor:profiles!editor_id(name)')
      .not('status', 'in', `(${TERMINAL.join(',')})`)
      .or('is_urgent.eq.true,status.eq.revisao_solicitada,priority.eq.critical')
      .order('created_at', { ascending: true })
      .limit(12),
    svc.from('operational_logs').select('id, action, entity_type, actor_name, actor_role, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  // Avg delivery hours (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: deliveredOrders } = await svc
    .from('orders')
    .select('created_at, updated_at')
    .eq('status', 'entregue')
    .gte('updated_at', thirtyDaysAgo)

  let avgDeliveryHours = 0
  if (deliveredOrders && deliveredOrders.length > 0) {
    const totalHours = deliveredOrders.reduce((sum: number, o: { created_at: string; updated_at: string }) => {
      const diff = new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()
      return sum + diff / 3_600_000
    }, 0)
    avgDeliveryHours = Math.round(totalHours / deliveredOrders.length)
  }

  // Online editors: distinct editor_ids in active editing statuses
  const onlineSet = new Set((onlineEditorsRes.data ?? []).map((o: { editor_id: string | null }) => o.editor_id).filter(Boolean))

  // Overdue orders
  const now = Date.now()
  const allOrders = (allOrdersRes.data ?? []) as Array<{ id: string; status: string; created_at: string; sla_hours: number }>
  const overdueCount = allOrders.filter((o) => {
    if (TERMINAL.includes(o.status)) return false
    const slaMs = (o.sla_hours ?? 48) * 3_600_000
    return now > new Date(o.created_at).getTime() + slaMs
  }).length

  // Format critical orders
  type RawOrder = {
    id: string
    status: string
    is_urgent: boolean
    is_vip: boolean
    priority: string
    created_at: string
    sla_hours: number
    clips_requested: number
    profiles: { name: string } | null
    editor: { name: string } | null
  }

  const criticalOrders = ((allOrdersRes.data ?? []) as unknown as RawOrder[]).slice(0, 10).map((o) => {
    const slaH = o.sla_hours ?? 48
    const hoursWaiting = Math.round((now - new Date(o.created_at).getTime()) / 3_600_000)
    const hoursRemaining = Math.round((new Date(o.created_at).getTime() + slaH * 3_600_000 - now) / 3_600_000)
    const isOverdue = hoursRemaining < 0
    let slaLabel: string
    let slaColor: string
    if (isOverdue) {
      slaLabel = `${Math.abs(hoursRemaining)}h atrasado`
      slaColor = 'text-red-400'
    } else if (hoursRemaining < 4) {
      slaLabel = `${hoursRemaining}h`
      slaColor = 'text-red-400'
    } else if (hoursRemaining < 12) {
      slaLabel = `${hoursRemaining}h`
      slaColor = 'text-orange-400'
    } else {
      slaLabel = `${Math.floor(hoursRemaining / 24)}d`
      slaColor = 'text-zinc-400'
    }

    const STATUS_LABELS: Record<string, string> = {
      aguardando: 'Aguardando', em_analise: 'Em Análise', na_fila: 'Na Fila',
      atribuido: 'Atribuído', em_edicao: 'Em Edição', revisao_interna: 'Revisão Interna',
      pronto: 'Pronto', revisao_solicitada: 'Revisão Solicitada', aprovacao: 'Aprovação',
      entregue: 'Entregue', publicado: 'Publicado', cancelado: 'Cancelado', falhou: 'Falhou', pausado: 'Pausado',
    }

    return {
      id:          o.id,
      clientName:  (o.profiles as { name: string } | null)?.name ?? 'Cliente',
      editorName:  (o.editor as { name: string } | null)?.name ?? null,
      status:      o.status,
      statusLabel: STATUS_LABELS[o.status] ?? o.status,
      priority:    o.priority ?? 'normal',
      isUrgent:    o.is_urgent,
      isVip:       o.is_vip,
      hoursWaiting,
      slaStatus:   slaLabel,
      slaColor,
      isOverdue,
    }
  })

  return NextResponse.json({
    metrics: {
      activeOrders:      activeRes.count      ?? 0,
      overdueOrders:     overdueCount,
      inEditing:         editingRes.count     ?? 0,
      inReview:          reviewRes.count      ?? 0,
      deliveredToday:    deliveredTodayRes.count ?? 0,
      avgDeliveryHours,
      pendingRevisions:  revisionRes.count    ?? 0,
      activeClients:     clientsRes.count     ?? 0,
      totalEditors:      editorsRes.count     ?? 0,
      editorsOnline:     onlineSet.size,
    },
    criticalOrders,
    recentActivity: (recentLogsRes.data ?? []).map((l: {
      id: string; action: string; entity_type: string; actor_name: string | null; actor_role: string | null; created_at: string
    }) => ({
      id:         l.id,
      action:     l.action,
      entityType: l.entity_type,
      actorName:  l.actor_name,
      actorRole:  l.actor_role,
      createdAt:  l.created_at,
    })),
  })
}
