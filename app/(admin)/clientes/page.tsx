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
      <h1 className="text-xl font-semibold text-white mb-1">Clientes</h1>
      <p className="text-zinc-400 text-sm mb-8">Gerencie os clientes da agência.</p>
      <ClientesClient initialClients={clients ?? []} />
    </div>
  )
}
