export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarioClient from '@/components/calendario/calendario-client'

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  // 1. Get client's order IDs
  const { data: clientOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('client_id', userId)

  const orderIds = (clientOrders ?? []).map((o: { id: string }) => o.id)

  // 2. Get approved deliverables for those orders
  const { data: deliverables } = orderIds.length
    ? await supabase
        .from('deliverables')
        .select('id, clip_number, delivered_at')
        .in('order_id', orderIds)
        .not('approved_at', 'is', null)
        .order('delivered_at')
    : { data: [] }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Calendário</h1>
      <p className="text-zinc-400 text-sm mb-8">Visualize seus dias de entrega.</p>
      <CalendarioClient deliverables={deliverables ?? []} />
    </div>
  )
}
