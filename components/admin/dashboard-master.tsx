'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Film,
  TrendingUp, Users, Zap, RefreshCw, ArrowRight,
  Timer, Eye, AlertCircle, Radio,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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
  activeOrders:        number
  overdueOrders:       number
  inEditing:           number
  inReview:            number
  deliveredToday:      number
  avgDeliveryHours:    number
  pendingRevisions:    number
  activeClients:       number
  totalEditors:        number
  editorsOnline:       number
  clipsAwaitingClient: number
}

interface DashboardMasterProps {
  metrics:        DashboardMetrics
  criticalOrders: CriticalOrder[]
  recentActivity: RecentActivity[]
}

interface OnlineEditor {
  userId:   string
  userName: string
  onlineAt: string
}

interface LiveEvent {
  id:         string
  eventType:  'INSERT' | 'UPDATE' | string
  table:      string
  payload:    Record<string, unknown>
  receivedAt: Date
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

function timeAgo(date: string | Date): string {
  const diff  = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  > 0) return `${days}d atrás`
  if (hours > 0) return `${hours}h atrás`
  if (mins  > 0) return `${mins}min`
  return 'agora'
}

function eventLabel(table: string, eventType: string): string {
  if (table === 'orders') {
    return eventType === 'INSERT' ? 'Nova ordem' : 'Status atualizado'
  }
  if (table === 'deliverables') {
    return eventType === 'INSERT' ? 'Clipe entregue' : 'Clipe atualizado'
  }
  return eventType === 'INSERT' ? 'Novo registro' : 'Registro atualizado'
}

function onlineForLabel(onlineAt: string): string {
  const diff = Date.now() - new Date(onlineAt).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'online agora'
  return `online há ${mins}min`
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
  const router = useRouter()
  const [metrics,        setMetrics]        = useState(initialMetrics)
  const [criticalOrders, setCriticalOrders] = useState(initialCritical)
  const [recentActivity, setRecentActivity] = useState(initialActivity)
  const [refreshing,     setRefreshing]     = useState(false)
  const [lastUpdated,    setLastUpdated]    = useState(new Date())
  const [isLive,         setIsLive]         = useState(false)
  const [liveEvents,     setLiveEvents]     = useState<LiveEvent[]>([])
  const [newEventCount,  setNewEventCount]  = useState(0)
  const [onlineEditors,  setOnlineEditors]  = useState<OnlineEditor[]>([])

  const addLiveEvent = useCallback((
    table: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => {
    const event: LiveEvent = {
      id:         `${table}-${Date.now()}-${Math.random()}`,
      eventType:  payload.eventType,
      table,
      payload:    (payload.new ?? payload.old ?? {}) as Record<string, unknown>,
      receivedAt: new Date(),
    }
    setLiveEvents((prev) => [event, ...prev].slice(0, 20))
    setNewEventCount((prev) => prev + 1)
  }, [])

  // Supabase Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const dbChannel = supabase
      .channel('dashboard-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => addLiveEvent('orders', payload),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => addLiveEvent('orders', payload),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deliverables' },
        (payload) => addLiveEvent('deliverables', payload),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliverables' },
        (payload) => addLiveEvent('deliverables', payload),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true)
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsLive(false)
      })

    const presenceChannel = supabase
      .channel('editor-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as Record<string, { userId: string; userName: string; onlineAt: string }[]>
        const editors: OnlineEditor[] = Object.values(state).flatMap((presences) =>
          presences.map((p) => ({
            userId:   p.userId,
            userName: p.userName,
            onlineAt: p.onlineAt,
          }))
        )
        setOnlineEditors(editors)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(dbChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [addLiveEvent])

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

  function handleServerRefresh() {
    router.refresh()
    setLastUpdated(new Date())
    setNewEventCount(0)
  }

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  const visibleEvents = liveEvents.slice(0, 10)

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
        <div className="flex items-center gap-3">
          {/* LIVE indicator */}
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-green-400 text-xs font-semibold tracking-wide">AO VIVO</span>
            </div>
          )}
          {/* Refresh (server data) */}
          <button
            onClick={handleServerRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
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
        <MetricCard
          label="Aguard. Cliente"
          value={metrics.clipsAwaitingClient}
          sub="aprovação pendente"
          icon={Clock}
          color={metrics.clipsAwaitingClient > 0 ? 'amber' : 'zinc'}
          alert={metrics.clipsAwaitingClient > 0}
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
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <h2 className="text-white font-semibold text-sm">Atividade Recente</h2>
            </div>
            {newEventCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-950/40 border border-green-800/50 text-green-400 animate-pulse">
                {newEventCount} novo{newEventCount !== 1 ? 's' : ''} evento{newEventCount !== 1 ? 's' : ''}
              </span>
            )}
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

      {/* Online Editors + Live Events — bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Editors */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-500" />
            <h2 className="text-white font-semibold text-sm">Editores Online</h2>
            {onlineEditors.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-950/40 border border-green-800/50 text-green-400">
                {onlineEditors.length}
              </span>
            )}
          </div>

          {onlineEditors.length === 0 ? (
            <p className="text-zinc-500 text-xs">Nenhum editor online agora</p>
          ) : (
            <div className="space-y-2.5">
              {onlineEditors.map((editor) => (
                <div key={editor.userId} className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-zinc-300 text-sm font-medium">{editor.userName}</span>
                  <span className="text-zinc-600 text-xs">—</span>
                  <span className="text-zinc-500 text-xs">{onlineForLabel(editor.onlineAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Events Feed */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-zinc-500" />
              <h2 className="text-white font-semibold text-sm">Pulso em Tempo Real</h2>
            </div>
            {liveEvents.length > 0 && (
              <span className="text-zinc-500 text-xs">
                {liveEvents.length} evento{liveEvents.length !== 1 ? 's' : ''} capturado{liveEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {visibleEvents.length === 0 ? (
            <p className="text-zinc-600 text-xs">
              {isLive ? 'Aguardando eventos...' : 'Conectando ao Realtime...'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {visibleEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg bg-zinc-800/20 animate-in fade-in duration-300"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    event.eventType === 'INSERT' ? 'bg-green-500' : 'bg-zinc-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-snug ${
                      event.eventType === 'INSERT' ? 'text-green-400' : 'text-zinc-400'
                    }`}>
                      {eventLabel(event.table, event.eventType)}
                    </p>
                    <p className="text-zinc-600 text-[11px] mt-0.5 truncate">
                      tabela: {event.table}
                      {typeof event.payload.id === 'string' && ` · ${event.payload.id.slice(0, 8)}…`}
                    </p>
                  </div>
                  <span className="text-zinc-600 text-[11px] shrink-0 mt-0.5 tabular-nums">
                    {timeAgo(event.receivedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
