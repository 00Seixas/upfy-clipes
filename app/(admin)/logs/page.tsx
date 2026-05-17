export const dynamic = 'force-dynamic'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogsClient from '@/components/admin/logs-client'
import { fetchLogs } from '@/lib/services/audit'

export default async function LogsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const svc = createServiceClient()

  const [{ logs, total }, editorsRes] = await Promise.all([
    fetchLogs({ limit: 50 }),
    svc.from('profiles').select('id, name').eq('role', 'editor'),
  ])

  return (
    <LogsClient
      initialLogs={logs}
      total={total}
      editors={(editorsRes.data ?? []) as { id: string; name: string }[]}
    />
  )
}
