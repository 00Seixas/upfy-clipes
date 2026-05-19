export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import ClientesClient from '@/components/admin/clientes-page-client'

export default async function ClientesPage() {
  const supabase = createServiceClient()

  const { data: clients } = await supabase
    .from('profiles')
    .select(`
      id, name, whatsapp, created_at,
      client_contracts(id, clips_total, clips_delivered, start_date, end_date, status, payment_link, notes)
    `)
    .eq('role', 'cliente')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Pessoas</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Clientes</h1>
        <p className="text-zinc-500 text-sm mt-1">Gerencie os clientes da agência.</p>
      </div>
      <ClientesClient initialClients={clients ?? []} />
    </div>
  )
}
