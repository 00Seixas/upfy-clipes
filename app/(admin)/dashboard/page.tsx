export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/admin/dashboard-client'

const DEMO = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

export default async function AdminDashboardPage() {
  if (DEMO) return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Dashboard</h1>
      <p className="text-zinc-400 text-sm mb-8">Visão geral da operação.</p>
      <DashboardClient metrics={{ totalAtivos: 0, totalEncerrando: 0, totalAguardando: 0, totalEncerrados: 0, emProducao: 0, clipesMes: 0, editoresAtivos: 0 }} alerts={{ encerrando: [], semRenovacao: [], semEditor: [] }} />
    </div>
  )

  const supabase = createServiceClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalAtivos },
    { count: totalEncerrando },
    { count: totalAguardando },
    { count: totalEncerrados },
    { count: emProducao },
    { count: clipesMes },
    { count: editoresAtivos },
    { data: encerrandoAlerts },
    { data: semRenovacaoAlerts },
    { data: semEditorAlerts },
  ] = await Promise.all([
    supabase.from('client_contracts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('client_contracts').select('*', { count: 'exact', head: true }).eq('status', 'encerrando'),
    supabase.from('client_contracts').select('*', { count: 'exact', head: true }).eq('status', 'aguardando_renovacao'),
    supabase.from('client_contracts').select('*', { count: 'exact', head: true }).eq('status', 'encerrado'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['aguardando', 'em_edicao', 'aprovacao']),
    supabase.from('deliverables').select('*', { count: 'exact', head: true }).gte('delivered_at', startOfMonth),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'editor'),
    supabase.from('client_contracts')
      .select('user_id, end_date, profiles!inner(name)')
      .eq('status', 'encerrando')
      .lte('end_date', threeDaysFromNow),
    supabase.from('client_contracts')
      .select('user_id, end_date, profiles!inner(name)')
      .eq('status', 'aguardando_renovacao')
      .lte('end_date', twoDaysAgo),
    supabase.from('orders')
      .select('id, created_at, profiles!orders_client_id_fkey(name)')
      .eq('status', 'aguardando')
      .lte('created_at', twelveHoursAgo),
  ])

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Dashboard</h1>
      <p className="text-zinc-400 text-sm mb-8">Visão geral da operação.</p>
      <DashboardClient
        metrics={{
          totalAtivos: totalAtivos ?? 0,
          totalEncerrando: totalEncerrando ?? 0,
          totalAguardando: totalAguardando ?? 0,
          totalEncerrados: totalEncerrados ?? 0,
          emProducao: emProducao ?? 0,
          clipesMes: clipesMes ?? 0,
          editoresAtivos: editoresAtivos ?? 0,
        }}
        alerts={{
          encerrando: (encerrandoAlerts ?? []).map(a => ({
            ...a,
            profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
          })) as any,
          semRenovacao: (semRenovacaoAlerts ?? []).map(a => ({
            ...a,
            profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
          })) as any,
          semEditor: (semEditorAlerts ?? []).map(a => ({
            ...a,
            profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
          })) as any,
        }}
      />
    </div>
  )
}
