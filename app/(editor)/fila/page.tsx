export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FilaClient from '@/components/editor/fila-client'

export default async function FilaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, briefing, created_at, deadline,
      profiles!orders_client_id_fkey(name, whatsapp)
    `)
    .eq('status', 'aguardando')
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Fila de Produção</h1>
      <p className="text-zinc-400 text-sm mb-8">Pedidos aguardando editor. Mais urgentes primeiro.</p>
      <FilaClient
        orders={(orders ?? []).map(o => ({
          ...o,
          profiles: Array.isArray(o.profiles) ? o.profiles[0] : o.profiles,
        })) as any}
        editorId={user.id}
      />
    </div>
  )
}
