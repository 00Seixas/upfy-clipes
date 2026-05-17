import { createServiceClient } from '@/lib/supabase/server'
import { getWorkloadCategory, getWorkloadInfo, DIFFICULTY_CONFIG, WORKLOAD_CONFIG } from '@/types/domain'
import type { WorkloadInfo } from '@/types/domain'

const ACTIVE_EDITOR_STATUSES = ['aguardando', 'atribuido', 'em_edicao', 'revisao_interna', 'revisao_solicitada', 'aprovacao', 'pausado']

export async function calculateEditorWorkload(editorId: string): Promise<WorkloadInfo> {
  const supabase = createServiceClient()

  const { data: activeOrders } = await supabase
    .from('orders')
    .select('difficulty')
    .eq('editor_id', editorId)
    .in('status', ACTIVE_EDITOR_STATUSES)

  const orders = (activeOrders ?? []) as { difficulty: string | null }[]
  const activeCount = orders.length

  const difficultyScore = orders.reduce((sum, o) => {
    const d = (o.difficulty ?? 'medium') as keyof typeof DIFFICULTY_CONFIG
    return sum + (DIFFICULTY_CONFIG[d]?.score ?? 2)
  }, 0)

  return getWorkloadInfo(activeCount, difficultyScore)
}

export async function getAllEditorsWorkload(): Promise<Record<string, WorkloadInfo>> {
  const supabase = createServiceClient()

  const { data: editors } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'editor')

  if (!editors || editors.length === 0) return {}

  const results = await Promise.all(
    (editors as { id: string }[]).map(async (e) => ({
      id:  e.id,
      wl: await calculateEditorWorkload(e.id),
    }))
  )

  return Object.fromEntries(results.map((r) => [r.id, r.wl]))
}

export async function canEditorPickOrder(editorId: string): Promise<{ can: boolean; reason?: string }> {
  const supabase = createServiceClient()

  // Validate editor role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', editorId)
    .single()

  if (!profile || profile.role !== 'editor') {
    return { can: false, reason: 'Perfil de editor não encontrado' }
  }

  // Fetch max active orders setting
  const { data: maxSetting } = await supabase
    .from('operational_settings')
    .select('value')
    .eq('key', 'editor_max_active_orders')
    .single()

  const maxOrders = maxSetting ? Number(maxSetting.value) : 5
  const workload  = await calculateEditorWorkload(editorId)

  if (workload.active_orders >= maxOrders) {
    return {
      can:    false,
      reason: `Limite de pedidos ativos atingido (${workload.active_orders}/${maxOrders})`,
    }
  }

  if (workload.category === 'critical') {
    return { can: false, reason: 'Carga crítica — conclua pedidos ativos primeiro' }
  }

  return { can: true }
}

export async function suggestEditor(
  orderId: string
): Promise<{ editorId: string; editorName: string; reason: string } | null> {
  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('difficulty')
    .eq('id', orderId)
    .single()

  if (!order) return null

  const { data: editors } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'editor')

  if (!editors || editors.length === 0) return null

  const workloads = await getAllEditorsWorkload()

  let bestEditor: { id: string; name: string } | null = null
  let bestScore = Infinity

  for (const editor of editors as { id: string; name: string }[]) {
    const { can } = await canEditorPickOrder(editor.id)
    if (!can) continue

    const wl = workloads[editor.id]
    if (!wl) continue

    if (wl.difficulty_score < bestScore) {
      bestScore  = wl.difficulty_score
      bestEditor = editor
    }
  }

  if (!bestEditor) return null

  const wl = workloads[bestEditor.id]
  return {
    editorId:   bestEditor.id,
    editorName: bestEditor.name,
    reason:     `${WORKLOAD_CONFIG[wl.category].label} — ${wl.active_orders} pedidos ativos`,
  }
}

export async function snapshotWorkloads(): Promise<void> {
  const supabase  = createServiceClient()
  const workloads = await getAllEditorsWorkload()

  const snapshots = Object.entries(workloads).map(([editorId, w]) => ({
    editor_id:       editorId,
    active_orders:   w.active_orders,
    difficulty_score: w.difficulty_score,
    category:        w.category,
  }))

  if (snapshots.length > 0) {
    await supabase.from('workload_snapshots').insert(snapshots)
  }
}
