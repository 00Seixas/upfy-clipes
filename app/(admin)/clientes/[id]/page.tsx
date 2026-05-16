export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteDetalheClient from '@/components/admin/cliente-detalhe-client'

export default async function ClienteDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const [{ data: profile }, { data: contract }, { data: deliverables }, { data: whatsappLogs }] = await Promise.all([
    supabase.from('profiles').select('id, name, whatsapp, created_at').eq('id', params.id).single(),
    supabase.from('client_contracts').select('*').eq('user_id', params.id).single(),
    supabase.from('deliverables')
      .select('id, clip_number, virality_grade, feedback, delivered_at, orders!inner(client_id)')
      .eq('orders.client_id', params.id)
      .not('approved_at', 'is', null)
      .order('delivered_at'),
    supabase.from('whatsapp_logs').select('id, message, status, created_at').eq('user_id', params.id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!profile) notFound()

  return (
    <ClienteDetalheClient
      profile={profile}
      contract={contract}
      deliverables={deliverables ?? []}
      whatsappLogs={whatsappLogs ?? []}
    />
  )
}
