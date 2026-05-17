export const dynamic = 'force-dynamic'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QueueMaster from '@/components/admin/queue-master'
import { calculateEditorWorkload } from '@/lib/services/workload'
import { WORKLOAD_CONFIG } from '@/types/domain'

export default async function KanbanPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const svc = createServiceClient()

  // Fetch all non-canceled orders with enterprise fields
  const { data: ordersRaw } = await svc
    .from('orders')
    .select(`
      id, client_id, editor_id, status, briefing, deadline, created_at, updated_at,
      priority, is_urgent, is_vip, difficulty, internal_notes, clips_requested,
      paused_at, canceled_at, sla_hours,
      profiles:profiles!client_id(name, whatsapp),
      editor:profiles!editor_id(name, email)
    `)
    .not('status', 'in', '(cancelado,publicado)')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: true })

  // Fetch editors with workload
  const { data: editorsRaw } = await svc
    .from('profiles')
    .select('id, name')
    .eq('role', 'editor')

  const editors = await Promise.all(
    ((editorsRaw ?? []) as { id: string; name: string }[]).map(async (e) => {
      const wl = await calculateEditorWorkload(e.id)
      return {
        id:            e.id,
        name:          e.name,
        workload:      WORKLOAD_CONFIG[wl.category].label,
        active_orders: wl.active_orders,
      }
    })
  )

  type RawOrder = {
    id: string; client_id: string; editor_id: string | null
    status: string; briefing: Record<string, string>; deadline: string | null
    created_at: string; updated_at: string
    priority: string | null; is_urgent: boolean | null; is_vip: boolean | null
    difficulty: string | null; internal_notes: string | null
    clips_requested: number | null; paused_at: string | null
    canceled_at: string | null; sla_hours: number | null
    profiles: { name: string; whatsapp: string | null } | { name: string; whatsapp: string | null }[] | null
    editor: { name: string; email: string | null } | { name: string; email: string | null }[] | null
  }

  const orders = ((ordersRaw ?? []) as RawOrder[]).map((o) => ({
    ...o,
    priority:        (o.priority        ?? 'normal')  as 'low' | 'normal' | 'high' | 'critical',
    is_urgent:       o.is_urgent        ?? false,
    is_vip:          o.is_vip           ?? false,
    difficulty:      (o.difficulty      ?? 'medium') as 'easy' | 'medium' | 'hard' | 'expert',
    internal_notes:  o.internal_notes   ?? null,
    clips_requested: o.clips_requested  ?? 1,
    paused_at:       o.paused_at        ?? null,
    canceled_at:     o.canceled_at      ?? null,
    sla_hours:       o.sla_hours        ?? 48,
    // normalize arrays from Supabase joins
    profiles: Array.isArray(o.profiles) ? (o.profiles[0] ?? null) : o.profiles,
    editor:   Array.isArray(o.editor)   ? (o.editor[0]   ?? null) : o.editor,
  }))

  return (
    <QueueMaster
      orders={orders as never}
      editors={editors}
      currentAdminId={user.id}
      currentAdminName={(profile as { name: string }).name ?? 'Admin'}
    />
  )
}
