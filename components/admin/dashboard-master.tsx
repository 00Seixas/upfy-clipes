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
  id:           string
  clientName:   string
  editorName:   string | null
  status:       string
  statusLabel:  string
  priority:     string
  isUrgent:     boolean
  isVip:        boolean
  hoursWaiting: number
  slaStatus:    string
  slaColor:     string
  isOverdue:    boolean
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
  'order.status_changed':   'Status alterado',
  'order.assigned':         'Editor atribuído',
  'order.marked_urgent':    'Marcado urgente',
  'order.priority_changed': 'Prioridade alterada',
  'order.canceled':         'Pedido cancelado',
  'order.paused':           'Pedido pausado',
  'order.resumed':          'Pedido retomado',
  'order.note_added':       'Nota adicionada',
  'payout.approved':        'Saque aprovado',
  'payout.paid':            'Saque pago',
  'payout.rejected':        'Saque rejeitado',
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
  label, value, sub, icon: Icon, alert = false, alertValue = false,
}: {
  label:       string
  value:       string | number
  sub?:        string
  icon:        React.ComponentType<{ className?: string }>
  alert?:      boolean
  alertValue?: boolean
}) {
  return (
    <div className="relative bg-[#080809] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors">
      {alert && alertValue && (
        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-zinc-700 mb-2 select-none">
            {label}
          </p>
          <p className={`text-3xl font-black tabular-nums leading-none ${alertValue ? 'text-red-400' : 'text-white'}`}>
            {value}
          </p>
          {sub && <p className="text-zinc-700 text-xs mt-1.5">{sub}</p>}
        </div>
        <Icon className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
      </div>
    </div>
  )
}

export default function DashboardMaster({
  metrics:        initialMetrics,
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

  useEffect(() => {
    const supabase = createClient()

    const dbChannel = supabase
      .channel('dashboard-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => addLiveEvent('orders', payload))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => addLiveEvent('orders', payload))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliverables' },
        (payload) => addLiveEvent('deliverables', payload))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliverables' },
        (payload) => addLiveEvent('deliverables', payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true)
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsLive(false)
      })

    const presenceChannel = supabase
      .channel('editor-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as Record<string, { userId: string; userName: string; onlineAt: string }[]>
        const editors: OnlineEditor[] = Object.values(state).flatMap((presences) =>
          presences.map((p) => ({ userId: p.userId, userName: p.userName, onlineAt: p.onlineAt }))
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
          <h1 className="text-white text-xl font-semibold">Dashboard Operacional</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              <span className="text-green-400 text-[10px] font-bold tracking-[0.15em] uppercase">Ao Vivo</span>
            </div>
          )}
          <button
            onClick={handleServerRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#080809] border border-white/[0.06] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.12] transition-all text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Pedidos Ativos"
          value={metrics.activeOrders}
          icon={Activity}
        />
        <MetricCard
          label="Em Edição"
          value={metrics.inEditing}
          icon={Film}
        />
        <MetricCard
          label="Em Revisão"
          value={metrics.inReview}
          icon={Eye}
        />
        <MetricCard
          label="Atrasados"
          value={metrics.overdueOrders}
          icon={AlertTriangle}
          alert
          alertValue={metrics.overdueOrders > 0}
        />
        <MetricCard
          label="Entregues Hoje"
          value={metrics.deliveredToday}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Tempo Médio"
          value={`${metrics.avgDeliveryHours}h`}
          sub="por entrega"
          icon={Timer}
        />
        <MetricCard
          label="Revisões Pend."
          value={metrics.pendingRevisions}
          icon={AlertCircle}
          alert
          alertValue={metrics.pendingRevisions > 0}
        />
        <MetricCard
          label="Editores"
          value={`${metrics.editorsOnline}/${metrics.totalEditors}`}
          sub="online / total"
          icon={Zap}
        />
        <MetricCard
          label="Aguard. Cliente"
          value={metrics.clipsAwaitingClient}
          sub="aprovação pendente"
          icon={Clock}
          alert
          alertValue={metrics.clipsAwaitingClient > 2}
        />
        <MetricCard
          label="Clientes Ativos"
          value={metrics.activeClients}
          icon={Users}
        />
      </div>

      {/* Main content: critical orders + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <h2 className="text-white font-semibold text-sm">Pedidos Críticos</h2>
              {criticalOrders.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-red-500/20 bg-red-500/[0.06] text-red-400 font-bold">
                  {criticalOrders.length}
                </span>
              )}
            </div>
            <Link
              href="/kanban"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Ver fila <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {criticalOrders.length === 0 ? (
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-10 text-center">
              <CheckCircle2 className="w-7 h-7 text-zinc-800 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Nenhum pedido crítico</p>
              <p className="text-zinc-700 text-xs mt-1">Tudo sob controle</p>
            </div>
          ) : (
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left text-[9px] uppercase tracking-[0.15em] text-zinc-700 px-4 py-3 font-bold">Cliente</th>
                      <th className="text-left text-[9px] uppercase tracking-[0.15em] text-zinc-700 px-4 py-3 font-bold">Editor</th>
                      <th className="text-left text-[9px] uppercase tracking-[0.15em] text-zinc-700 px-4 py-3 font-bold">Status</th>
                      <th className="text-left text-[9px] uppercase tracking-[0.15em] text-zinc-700 px-4 py-3 font-bold">Aguardando</th>
                      <th className="text-left text-[9px] uppercase tracking-[0.15em] text-zinc-700 px-4 py-3 font-bold">SLA</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {criticalOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white text-xs font-medium truncate max-w-[110px]">
                              {order.clientName}
                            </span>
                            {order.isUrgent && (
                              <span className="text-[9px] px-1 py-0.5 rounded border border-red-500/20 bg-red-500/[0.06] text-red-400 font-bold">
                                URGENTE
                              </span>
                            )}
                            {order.isVip && (
                              <span className="text-[9px] px-1 py-0.5 rounded border border-white/[0.1] text-zinc-400 font-bold">
                                VIP
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{order.editorName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-400">{order.statusLabel}</span>
                        </td>
                        <td className={`px-4 py-3 text-xs tabular-nums font-medium ${order.hoursWaiting > 24 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {order.hoursWaiting}h
                        </td>
                        <td className={`px-4 py-3 text-xs tabular-nums font-bold ${order.slaColor}`}>
                          {order.slaStatus}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href="/kanban"
                            className="text-xs text-zinc-700 hover:text-zinc-300 transition-colors"
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
              <Clock className="w-3.5 h-3.5 text-zinc-700" />
              <h2 className="text-white font-semibold text-sm">Atividade Recente</h2>
            </div>
            {newEventCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-green-500/20 bg-green-500/[0.06] text-green-400 font-bold animate-pulse">
                +{newEventCount} novo{newEventCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6 text-center">
              <p className="text-zinc-600 text-xs">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-px">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-1 h-1 rounded-full bg-zinc-700 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-400 text-xs leading-snug">
                      {ACTION_LABELS[activity.action] ?? activity.action}
                    </p>
                    {activity.actorName && (
                      <p className="text-zinc-700 text-[11px] mt-0.5 truncate">
                        {activity.actorName}
                        {activity.actorRole && (
                          <span className="ml-1 text-zinc-800">· {activity.actorRole}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-zinc-700 text-[11px] shrink-0 mt-0.5 tabular-nums">
                    {timeAgo(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Mini stats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-3 text-center">
              <p className="text-white text-2xl font-black">{metrics.activeClients}</p>
              <p className="text-zinc-700 text-[10px] mt-0.5 uppercase tracking-[0.12em] font-bold">Clientes</p>
            </div>
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-3 text-center">
              <p className="text-white text-2xl font-black">{metrics.totalEditors}</p>
              <p className="text-zinc-700 text-[10px] mt-0.5 uppercase tracking-[0.12em] font-bold">Editores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Online Editors + Live Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Editors */}
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-3.5 h-3.5 text-zinc-700" />
            <h2 className="text-white font-semibold text-sm">Editores Online</h2>
            {onlineEditors.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-green-500/20 bg-green-500/[0.06] text-green-400 font-bold">
                {onlineEditors.length}
              </span>
            )}
          </div>

          {onlineEditors.length === 0 ? (
            <p className="text-zinc-700 text-xs">Nenhum editor online agora</p>
          ) : (
            <div className="space-y-3">
              {onlineEditors.map((editor) => (
                <div key={editor.userId} className="flex items-center gap-2.5">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  <span className="text-zinc-300 text-sm font-medium">{editor.userName}</span>
                  <span className="text-zinc-700 text-xs ml-auto">{onlineForLabel(editor.onlineAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Events Feed */}
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-zinc-700" />
              <h2 className="text-white font-semibold text-sm">Pulso em Tempo Real</h2>
            </div>
            {liveEvents.length > 0 && (
              <span className="text-zinc-700 text-[11px]">
                {liveEvents.length} evento{liveEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {visibleEvents.length === 0 ? (
            <p className="text-zinc-700 text-xs">
              {isLive ? 'Aguardando eventos...' : 'Conectando ao Realtime...'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {visibleEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.03]"
                >
                  <div className={`w-1 h-1 rounded-full mt-2 shrink-0 ${
                    event.eventType === 'INSERT' ? 'bg-green-500' : 'bg-zinc-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-snug ${
                      event.eventType === 'INSERT' ? 'text-green-400' : 'text-zinc-400'
                    }`}>
                      {eventLabel(event.table, event.eventType)}
                    </p>
                    <p className="text-zinc-700 text-[11px] mt-0.5 truncate">
                      {event.table}
                      {typeof event.payload.id === 'string' && ` · ${event.payload.id.slice(0, 8)}…`}
                    </p>
                  </div>
                  <span className="text-zinc-700 text-[11px] shrink-0 mt-0.5 tabular-nums">
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
