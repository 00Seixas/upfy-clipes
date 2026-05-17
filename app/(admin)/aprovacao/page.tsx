export const dynamic = 'force-dynamic'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AprovacaoClient from '@/components/admin/aprovacao-client'

export default async function AprovacaoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const svc = createServiceClient()

  // 1. Fetch orders in 'aprovacao' status (uses only original schema columns)
  const { data: ordersRaw } = await svc
    .from('orders')
    .select(`
      id,
      client_id,
      briefing,
      created_at,
      profiles:profiles!client_id(name, whatsapp)
    `)
    .eq('status', 'aprovacao')

  const orderIds = (ordersRaw ?? []).map((o: { id: string }) => o.id)

  // 2. Fetch deliverables for those orders that are not yet approved
  const { data: delivRaw } = orderIds.length
    ? await svc
        .from('deliverables')
        .select(`
          id,
          order_id,
          editor_id,
          filename,
          clip_number,
          virality_grade,
          feedback,
          delivered_at,
          editor:profiles!editor_id(name)
        `)
        .in('order_id', orderIds)
        .is('approved_at', null)
        .order('delivered_at', { ascending: true })
    : { data: [] }

  // Build lookup map for orders
  type RawOrder = {
    id: string
    client_id: string
    briefing: Record<string, string>
    created_at: string
    profiles: { name: string; whatsapp: string | null } | { name: string; whatsapp: string | null }[] | null
  }
  const orderMap = Object.fromEntries(
    ((ordersRaw ?? []) as RawOrder[]).map((o) => [o.id, o])
  )

  type RawDeliv = {
    id: string
    order_id: string
    editor_id: string
    filename: string
    clip_number: number
    virality_grade: string
    feedback: string
    delivered_at: string
    editor: { name: string } | { name: string }[] | null
  }

  const deliverables = ((delivRaw ?? []) as RawDeliv[]).map((d) => {
    const order = orderMap[d.order_id] ?? null
    const clientProfile = order
      ? Array.isArray(order.profiles) ? (order.profiles[0] ?? null) : order.profiles
      : null
    const editorProfile = Array.isArray(d.editor) ? (d.editor[0] ?? null) : d.editor
    return {
      id:             d.id,
      orderId:        d.order_id,
      filename:       d.filename,
      clipNumber:     d.clip_number,
      viralityGrade:  d.virality_grade as 'frio' | 'morno' | 'quente' | 'viral',
      feedback:       d.feedback,
      deliveredAt:    d.delivered_at,
      clientName:     clientProfile?.name ?? 'Cliente',
      clientWhatsapp: clientProfile?.whatsapp ?? null,
      editorName:     editorProfile?.name ?? 'Editor',
      briefing:       order?.briefing ?? {},
      orderCreatedAt: order?.created_at ?? d.delivered_at,
    }
  })

  return <AprovacaoClient deliverables={deliverables} />
}
