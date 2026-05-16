export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MeusClipesClient from '@/components/clips/meus-clipes-client'

export default async function MeusClipesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  // Get client's order IDs first, then fetch deliverables
  const { data: clientOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('client_id', user.id)

  const orderIds = clientOrders?.map(o => o.id) ?? []

  const { data: deliverables } = orderIds.length
    ? await supabase
        .from('deliverables')
        .select('id, clip_number, virality_grade, feedback, delivered_at, r2_key, filename')
        .in('order_id', orderIds)
        .not('approved_at', 'is', null)
        .order('delivered_at', { ascending: true })
    : { data: [] }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Meus Clipes</h1>
      <p className="text-zinc-400 text-sm mb-8">Todos os clipes entregues organizados por data.</p>
      <MeusClipesClient deliverables={deliverables ?? []} />
    </div>
  )
}
