'use client'
import Link from 'next/link'
import { Users, UserCheck, AlertTriangle, Film, Clock, TrendingUp } from 'lucide-react'

interface Metrics {
  totalAtivos: number
  totalEncerrando: number
  totalAguardando: number
  totalEncerrados: number
  emProducao: number
  clipesMes: number
  editoresAtivos: number
}

interface Alerts {
  encerrando: { user_id: string; end_date: string; profiles: { name: string } }[]
  semRenovacao: { user_id: string; end_date: string; profiles: { name: string } }[]
  semEditor: { id: string; created_at: string; profiles: { name: string } | null }[]
}

const MetricCard = ({ label, value, icon: Icon, sub }: { label: string; value: number; icon: React.ElementType; sub?: string }) => (
  <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-zinc-500" />
      <span className="text-zinc-400 text-xs">{label}</span>
    </div>
    <p className="text-3xl font-semibold text-white">{value}</p>
    {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
  </div>
)

export default function DashboardClient({ metrics, alerts }: { metrics: Metrics; alerts: Alerts }) {
  const hasAlerts = alerts.encerrando.length + alerts.semRenovacao.length + alerts.semEditor.length > 0

  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Clientes ativos" value={metrics.totalAtivos} icon={Users} />
        <MetricCard label="Encerrando" value={metrics.totalEncerrando} icon={AlertTriangle} sub="em até 3 dias" />
        <MetricCard label="Aguard. renovação" value={metrics.totalAguardando} icon={Clock} />
        <MetricCard label="Clientes encerrados" value={metrics.totalEncerrados} icon={Users} />
        <MetricCard label="Em produção" value={metrics.emProducao} icon={Film} />
        <MetricCard label="Clipes esse mês" value={metrics.clipesMes} icon={TrendingUp} />
        <MetricCard label="Editores ativos" value={metrics.editoresAtivos} icon={UserCheck} />
      </div>

      {/* Urgent alerts */}
      {hasAlerts && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Alertas urgentes
          </h2>
          <div className="space-y-2">
            {alerts.encerrando.map(a => (
              <Link key={a.user_id} href={`/clientes/${a.user_id}`}
                className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg hover:border-yellow-500/40 transition-colors">
                <div>
                  <p className="text-white text-sm">{a.profiles?.name}</p>
                  <p className="text-yellow-400 text-xs">Contrato encerra em {new Date(a.end_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">Encerrando</span>
              </Link>
            ))}
            {alerts.semRenovacao.map(a => (
              <Link key={a.user_id} href={`/clientes/${a.user_id}`}
                className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors">
                <div>
                  <p className="text-white text-sm">{a.profiles?.name}</p>
                  <p className="text-red-400 text-xs">Sem renovação há mais de 2 dias</p>
                </div>
                <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">Sem renovação</span>
              </Link>
            ))}
            {alerts.semEditor.map(a => (
              <Link key={a.id} href="/kanban"
                className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors">
                <div>
                  <p className="text-white text-sm">{a.profiles?.name ?? 'Cliente'}</p>
                  <p className="text-zinc-400 text-xs">Pedido sem editor há mais de 12h</p>
                </div>
                <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">Sem editor</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!hasAlerts && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5 text-center">
          <p className="text-zinc-500 text-sm">Nenhum alerta urgente no momento. ✓</p>
        </div>
      )}
    </div>
  )
}
