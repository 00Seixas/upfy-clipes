export const dynamic = 'force-dynamic'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SLAPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const svc = createServiceClient()
  const TERMINAL = ['entregue', 'publicado', 'cancelado', 'falhou']

  const { data: ordersRaw } = await svc
    .from('orders')
    .select('id, status, created_at, sla_hours, is_urgent, priority, profiles:profiles!client_id(name)')
    .not('status', 'in', `(${TERMINAL.join(',')})`)
    .order('created_at', { ascending: true })

  const now = Date.now()
  type OrderRow = {
    id: string
    status: string
    created_at: string
    sla_hours: number | null
    is_urgent: boolean | null
    priority: string | null
    profiles: { name: string } | null
  }

  const orders = ((ordersRaw ?? []) as unknown as OrderRow[]).map(o => {
    const slaH = o.sla_hours ?? 48
    const deadline = new Date(o.created_at).getTime() + slaH * 3_600_000
    const remaining = Math.round((deadline - now) / 3_600_000)
    const isOverdue = remaining < 0
    return { ...o, remaining, isOverdue, deadline: new Date(deadline).toISOString() }
  }).sort((a, b) => a.remaining - b.remaining)

  const STATUS_LABELS: Record<string, string> = {
    aguardando: 'Aguardando',
    em_edicao: 'Em Edição',
    revisao_solicitada: 'Revisão',
    aprovacao: 'Aprovação',
  }

  const overdue  = orders.filter(o => o.isOverdue)
  const critical = orders.filter(o => !o.isOverdue && o.remaining < 4)
  const ok       = orders.filter(o => !o.isOverdue && o.remaining >= 4)

  function OrderRow({ o }: { o: typeof orders[0] }) {
    const color = o.isOverdue
      ? 'text-red-400'
      : o.remaining < 4
        ? 'text-amber-400'
        : 'text-zinc-400'
    const label = o.isOverdue
      ? `${Math.abs(o.remaining)}h atrasado`
      : `${o.remaining}h restantes`
    return (
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.03] last:border-0">
        <div className="flex items-center gap-3">
          <span className="text-zinc-600 text-xs font-mono w-20 truncate">{o.id.slice(0, 8)}</span>
          <span className="text-zinc-300 text-sm">{(o.profiles as { name: string } | null)?.name ?? '—'}</span>
          <span className="text-zinc-600 text-xs">{STATUS_LABELS[o.status] ?? o.status}</span>
        </div>
        <span className={`text-xs font-bold ${color}`}>{label}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Monitor</p>
        <h1 className="text-3xl font-black text-white tracking-tight">SLA Monitor</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {overdue.length} atrasados · {critical.length} críticos · {ok.length} no prazo
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="bg-[#080809] border border-red-500/20 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-red-400 text-[9px] uppercase tracking-[0.15em] font-bold">
              Atrasados — {overdue.length}
            </p>
          </div>
          {overdue.map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}

      {critical.length > 0 && (
        <div className="bg-[#080809] border border-amber-500/20 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-amber-400 text-[9px] uppercase tracking-[0.15em] font-bold">
              Críticos (&lt;4h) — {critical.length}
            </p>
          </div>
          {critical.map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}

      {ok.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">
              No prazo — {ok.length}
            </p>
          </div>
          {ok.map(o => <OrderRow key={o.id} o={o} />)}
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-400 text-sm font-medium">Nenhum pedido ativo.</p>
        </div>
      )}
    </div>
  )
}
