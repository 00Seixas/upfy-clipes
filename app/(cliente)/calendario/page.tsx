export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarioClient from '@/components/calendario/calendario-client'

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('id, clip_number, delivered_at, orders!inner(client_id)')
    .eq('orders.client_id', user?.id ?? '')
    .not('approved_at', 'is', null)
    .order('delivered_at')

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Calendário</h1>
      <p className="text-zinc-400 text-sm mb-8">Visualize seus dias de entrega.</p>
      <CalendarioClient deliverables={deliverables ?? []} />
    </div>
  )
}
