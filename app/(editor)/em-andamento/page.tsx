export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmAndamentoClient from '@/components/editor/em-andamento-client'

export default async function EmAndamentoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, briefing, created_at, updated_at, deadline,
      profiles!orders_client_id_fkey(name, whatsapp),
      videos(id, r2_key, filename, size_bytes)
    `)
    .eq('editor_id', userId)
    .eq('status', 'em_edicao')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch last revision note for this order (if any)
  const { data: lastRevision } = order?.id
    ? await supabase
        .from('deliverables')
        .select('revision_notes')
        .eq('order_id', order.id)
        .not('revision_requested_at', 'is', null)
        .order('revision_requested_at', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Em Andamento</h1>
      <p className="text-zinc-400 text-sm mb-8">Seu pedido atual em edição.</p>
      <EmAndamentoClient
        order={order ? {
          ...order,
          profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles,
        } as Parameters<typeof EmAndamentoClient>[0]['order'] : null}
        editorId={userId}
        revisionNotes={lastRevision?.revision_notes ?? null}
      />
    </div>
  )
}
