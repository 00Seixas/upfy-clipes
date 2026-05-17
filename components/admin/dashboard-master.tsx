'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Film,
  TrendingUp, Users, Zap, RefreshCw, ArrowRight,
  Timer, Eye, AlertCircle,
} from 'lucide-react'

interface CriticalOrder {
  id:          string
  clientName:  string
  editorName:  string | null
  status:      string
  statusLabel: string
  priority:    string
  isUrgent:    boolean
  isVip:       boolean
  hoursWaiting: number
  slaStatus:   string
  slaColor:    string
  isOverdue:   boolean
}

interface RecentActivity {
  id:         string
  action:     string
  entityType: string
  actorName:  string | null
  actorRole:  string | null
  createdAt:  string
}

interface DashboardMetrics {
  activeOrders:     number
  overdueOrders:    number
  inEditing:        number
  inReview:         number
  deliveredToday:   number
  avgDeliveryHours: number
  pendingRevisions: number
  activeClients:    number
  totalEditors:     number
  editorsOnline:    number
}

interface DashboardMasterProps {
  metrics:        DashboardMetrics
  criticalOrders: CriticalOrder[]
  recentActivity: RecentActivity[]
}

const ACTION_LABELS: Record<string, string> = {
  'order.status_changed':  'Status alterado',
  'order.assigned':        'Editor atribuído',
  'order.marked_urgent':   'Marcado urgente',
  'order.priority_changed':'Prioridade alterada',
  'order.canceled':        'Pedido cancelado',
  'order.paused':          'Pedido pausado',
  'order.resumed':         'Pedido retomado',
  'order.note_added':      'Nota adicionada',
  'payout.approved':       'Saque aprovado',
  'payout.paid':           'Saque pago',
  'payout.rejected':       'Saque rejeitado',
}

const PRIORITY_COLORS: Record<string, string> = {
  low:      'text-zinc-500',
  normal:   'text-zinc-300',
  high:     'text-orange-400',
  critical: 'text-red-400',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa', normal: 'Normal', high: 'Alta', critical: 'Crítica',
}

function timeAgo(date: string): string {
  const diff  = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  > 0) return `${days}d atrás`
  if (hours > 0) return `${hours}h atrás`
  if (mins  > 0) return `${mins}min atrás`
  return 'agora'
}

function MetricCard({
  label, value, sub, icon: Icon, color = 'zinc', alert = false,
}: {
  label:  string
  value:  string | number
  sub?:   string
  icon:   React.ComponentType<{ className?: string }>
  color?: string
  alert?: boolean
}) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    violet:  { bg: 'bg-violet-950/20',  text: 'text-violet-400',  iconBg: 'bg-violet-900/40'  },
    amber:   { bg: 'bg-amber-950/20',   text: 'text-amber-400',   iconBg: 'bg-amber-900/40'   },
    orange:  { bg: 'bg-orange-950/20',  text: 'text-orange-400',  iconBg: 'bg-orange-900/40'  },
    red:     { bg: 'bg-red-950/20',     text: 'text-red-400',     iconBg: 'bg-red-900/40'     },
    emerald: { bg: 'bg-emerald-950/20', text: 'text-emerald-400', iconBg: 'bg-emerald-900/40' },
    zinc:    { bg: 'bg-zinc-900/50',    text: 'text-zinc-300',    iconBg: 'bg-zinc-800/60'    },
  }

  const c = colorMap[color] ?? colorMap.zinc

  return (
    <div className={`relative overflow-hidden rounded-xl border border-zinc-800/60 ${c.bg} p-5 transition-all hover:border-zinc-700/60`}>
      {alert && Number(value) > 0 && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-zinc-500 text-xs font-medium mb-2 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold tabular-nums ${c.text}`}>{value}</p>
          {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardMaster({
  metrics: initialMetrics,
  criticalOrders: initialCritical,
  recentActivity: initialActivity,
}: DashboardMasterProps) {
  const [metrics,        setMetrics]        = useState(initialMetrics)
  const [criticalOrders, setCriticalOrders] = useState(initialCritical)
  const [recentActivity, setRecentActivity] = useState(initialActivity)
  const [refreshing,     setRefreshing]     = useState(false)
  const [lastUpdated,    setLastUpdated]    = useState(new Date())

  async function refresh() {
    setRefreshing(true)
    try {
      const res  = await fetch('/api/admin/metrics')
      const data = await res.json()
      if (data.metrics)        setMetrics(data.metrics)
      if (data.criticalOrders) setCriticalOrders(data.criticalOrders)
      if (data.recentActivity) setRecentActivity(data.recentActivity)
      setLastUpdated(new Date())
    } catch { /* ignore */ } finally {
      setRefreshing(false)
    }
  }

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Dashboard Operacional</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Central de controle — atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Pedidos Ativos"
          value={metrics.activeOrders}
          icon={Activity}
          color="violet"
        />
        <MetricCard
          label="Em Edição"
          value={metrics.inEditing}
          icon={Film}
          color="amber"
        />
        <MetricCard
          label="Em Revisão"
          value={metrics.inReview}
          icon={Eye}
          color="orange"
        />
        <MetricCard
          label="Atrasados"
          value={metrics.overdueOrders}
          icon={AlertTriangle}
          color={metrics.overdueOrders > 0 ? 'red' : 'zinc'}
          alert
        />
        <MetricCard
          label="Entregues Hoje"
          value={metrics.deliveredToday}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          label="Tempo Médio"
          value={`${metrics.avgDeliveryHours}h`}
          sub="nas últimas entregas"
          icon={Timer}
          color="zinc"
        />
        <MetricCard
          label="Revisões Pendentes"
          value={metrics.pendingRevisions}
          icon={AlertCircle}
          color={metrics.pendingRevisions > 0 ? 'red' : 'zinc'}
          alert
        />
        <MetricCard
          label="Editores"
          value={`${metrics.editorsOnline}/${metrics.totalEditors}`}
          sub="online / total"
          icon={Zap}
          color="violet"
        />
      </div>

      {/* Main content: critical orders + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-white font-semibold text-sm">Pedidos Críticos</h2>
              {criticalOrders.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-red-400">
                  {criticalOrders.length}
                </span>
              )}
            </div>
            <Link
              href="/kanban"
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Ver fila <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {criticalOrders.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-zinc-400 text-sm">Nenhum pedido crítico</p>
              <p className="text-zinc-600 text-xs mt-1">Tudo sob controle por enquanto</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">Cliente</th>
                      <th className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">Editor</th>
                      <th className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">Status</th>
                      <th className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">Aguardando</th>
                      <th className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">SLA</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {criticalOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-medium truncate max-w-[120px]">{order.clientName}</span>
                            {order.isUrgent && (
                              <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-red-400">
                                URGENTE
                              </span>
                            )}
                            {order.isVip && (
                              <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-violet-950/40 border border-violet-800/50 text-violet-400">
                                VIP
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{order.editorName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-300">{order.statusLabel}</span>
                        </td>
                        <td className={`px-4 py-3 text-xs tabular-nums ${order.hoursWaiting > 24 ? 'text-red-400' : 'text-zinc-400'}`}>
                          {order.hoursWaiting}h
                        </td>
                        <td className={`px-4 py-3 text-xs tabular-nums font-medium ${order.slaColor}`}>
                          {order.slaStatus}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href="/kanban"
                            className="text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h2 className="text-white font-semibold text-sm">Atividade Recente</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 text-center">
              <p className="text-zinc-500 text-xs">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs leading-snug">
                      {ACTION_LABELS[activity.action] ?? activity.action}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {activity.actorName && (
                        <span className="text-zinc-600 text-[11px]">{activity.actorName}</span>
                      )}
                      {activity.actorRole && (
                        <span className={`text-[10px] px-1 py-0 rounded ${
                          activity.actorRole === 'admin' ? 'text-violet-500' : 'text-amber-500'
                        }`}>
                          {activity.actorRole}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-600 text-[11px] shrink-0 mt-0.5">
                    {timeAgo(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick stats footer */}
          <div className="mt-4 pt-4 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3 text-center">
              <p className="text-white text-xl font-bold">{metrics.activeClients}</p>
              <p className="text-zinc-500 text-xs">Clientes</p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3 text-center">
              <p className="text-white text-xl font-bold">{metrics.totalEditors}</p>
              <p className="text-zinc-500 text-xs">Editores</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
