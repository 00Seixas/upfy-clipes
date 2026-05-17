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

  // Query deliverables pending approval (approved_at IS NULL) with order in 'aprovacao' status
  // Only use original schema columns to avoid breaking if migration 014 hasn't been applied yet
  const { data: raw } = await svc
    .from('deliverables')
    .select(`
      id,
      order_id,
      editor_id,
      r2_key,
      filename,
      clip_number,
      virality_grade,
      feedback,
      delivered_at,
      orders!inner(
        id,
        client_id,
        status,
        briefing,
        clips_requested,
        created_at,
        profiles:profiles!client_id(name, whatsapp)
      ),
      editor:profiles!editor_id(name)
    `)
    .is('approved_at', null)
    .eq('orders.status', 'aprovacao')
    .order('delivered_at', { ascending: true })

  type RawDeliverable = {
    id: string
    order_id: string
    editor_id: string
    r2_key: string
    filename: string
    clip_number: number
    virality_grade: string
    feedback: string
    delivered_at: string
    orders: {
      id: string
      client_id: string
      status: string
      briefing: Record<string, string>
      clips_requested: number
      created_at: string
      profiles: { name: string; whatsapp: string | null } | { name: string; whatsapp: string | null }[] | null
    } | null
    editor: { name: string } | { name: string }[] | null
  }

  const deliverables = ((raw ?? []) as unknown as RawDeliverable[]).map((d) => {
    const order = d.orders
    const clientProfile = Array.isArray(order?.profiles) ? (order?.profiles[0] ?? null) : order?.profiles
    const editorProfile = Array.isArray(d.editor) ? (d.editor[0] ?? null) : d.editor
    return {
      id:           d.id,
      orderId:      d.order_id,
      filename:     d.filename,
      clipNumber:   d.clip_number,
      viralityGrade: d.virality_grade as 'frio' | 'morno' | 'quente' | 'viral',
      feedback:     d.feedback,
      deliveredAt:  d.delivered_at,
      clientName:   clientProfile?.name ?? 'Cliente',
      clientWhatsapp: clientProfile?.whatsapp ?? null,
      editorName:   editorProfile?.name ?? 'Editor',
      briefing:     order?.briefing ?? {},
      orderCreatedAt: order?.created_at ?? d.delivered_at,
    }
  })

  return <AprovacaoClient deliverables={deliverables} />
}
