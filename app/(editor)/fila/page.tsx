export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FilaClient from '@/components/editor/fila-client'

export default async function FilaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, briefing, created_at, deadline,
      profiles!orders_client_id_fkey(name, whatsapp)
    `)
    .eq('status', 'aguardando')
    .order('created_at', { ascending: true })

  const { data: revisionOrders } = await supabase
    .from('orders')
    .select(`id, status, briefing, created_at, deadline, profiles!orders_client_id_fkey(name, whatsapp)`)
    .eq('status', 'revisao_solicitada')
    .eq('editor_id', userId)
    .order('updated_at', { ascending: false })

  return (
    <div>
      <FilaClient
        orders={(orders ?? []).map(o => ({
          ...o,
          profiles: Array.isArray(o.profiles) ? o.profiles[0] : o.profiles,
        })) as any}
        revisionOrders={(revisionOrders ?? []).map(o => ({
          ...o,
          profiles: Array.isArray(o.profiles) ? o.profiles[0] : o.profiles,
        })) as any}
        editorId={userId}
      />
    </div>
  )
}
