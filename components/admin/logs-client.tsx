'use client'
import { useState } from 'react'
import { ScrollText, Search, ChevronDown, ChevronUp, User, FileVideo, DollarSign, Users, Filter, X } from 'lucide-react'
import { timeAgo } from '@/types/domain'
import type { OperationalLog } from '@/types/domain'

interface LogsClientProps {
  initialLogs: OperationalLog[]
  total:       number
  editors:     Array<{ id: string; name: string }>
}

const ACTION_LABELS: Record<string, string> = {
  'order.status_changed':   'Status alterado',
  'order.assigned':         'Editor atribuído',
  'order.unassigned':       'Editor removido',
  'order.marked_urgent':    'Marcado urgente',
  'order.unmarked_urgent':  'Urgência removida',
  'order.priority_changed': 'Prioridade alterada',
  'order.canceled':         'Pedido cancelado',
  'order.paused':           'Pedido pausado',
  'order.resumed':          'Pedido retomado',
  'order.note_added':       'Nota interna adicionada',
  'payout.approved':        'Saque aprovado',
  'payout.paid':            'Saque pago',
  'payout.rejected':        'Saque rejeitado',
  'editor.assigned':        'Editor atribuído',
  'editor.blocked':         'Editor bloqueado',
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin:   { label: 'Admin',   color: 'text-zinc-300', bg: 'border border-zinc-800' },
  editor:  { label: 'Editor',  color: 'text-zinc-400', bg: 'border border-zinc-800' },
  cliente: { label: 'Cliente', color: 'text-zinc-500', bg: 'border border-zinc-800' },
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  order:  FileVideo,
  editor: User,
  payout: DollarSign,
  client: Users,
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null
  const cfg = ROLE_CONFIG[role]
  if (!cfg) return <span className="text-xs text-zinc-500">{role}</span>
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  )
}

const ACTION_COLOR: Record<string, string> = {
  'order.status_changed':   'text-zinc-400',
  'order.assigned':         'text-green-400/70',
  'order.unassigned':       'text-zinc-400',
  'order.marked_urgent':    'text-red-400/70',
  'order.unmarked_urgent':  'text-zinc-400',
  'order.priority_changed': 'text-zinc-400',
  'order.canceled':         'text-red-400/70',
  'order.paused':           'text-zinc-400',
  'order.resumed':          'text-green-400/70',
  'order.note_added':       'text-zinc-400',
  'payout.approved':        'text-green-400/70',
  'payout.paid':            'text-green-400/70',
  'payout.rejected':        'text-red-400/70',
  'editor.assigned':        'text-green-400/70',
  'editor.blocked':         'text-red-400/70',
}

function LogRow({ log }: { log: OperationalLog }) {
  const [expanded, setExpanded] = useState(false)
  const EntityIcon = ENTITY_ICONS[log.entity_type] ?? FileVideo
  const hasDetail  = log.before_data || log.after_data || Object.keys(log.metadata ?? {}).length > 0
  const actionColor = ACTION_COLOR[log.action] ?? 'text-zinc-400'

  return (
    <>
      <tr
        className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${hasDetail ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetail && setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-zinc-700 text-xs whitespace-nowrap tabular-nums">
          {new Date(log.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
          <br />
          <span className="text-zinc-800">{timeAgo(log.created_at)}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-300 text-sm font-medium">{log.actor_name ?? 'Sistema'}</span>
            <RoleBadge role={log.actor_role} />
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-sm ${actionColor}`}>
            {ACTION_LABELS[log.action] ?? log.action}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1.5 text-zinc-600 text-xs">
            <EntityIcon className="w-3.5 h-3.5" />
            <span className="font-mono truncate max-w-[100px]">{log.entity_id?.slice(0, 8) ?? '—'}</span>
          </span>
        </td>
        <td className="px-4 py-3">
          {hasDetail && (
            <button className="text-zinc-700 hover:text-zinc-300 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasDetail && (
        <tr className="border-b border-white/[0.04] bg-black/20">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {log.before_data && (
                <div>
                  <p className="text-zinc-700 uppercase tracking-[0.15em] font-bold text-[9px] mb-1">Antes</p>
                  <pre className="bg-black/20 border border-white/[0.06] rounded-xl p-3 text-zinc-500 overflow-auto max-h-40 text-[11px]">
                    {JSON.stringify(log.before_data, null, 2)}
                  </pre>
                </div>
              )}
              {log.after_data && (
                <div>
                  <p className="text-zinc-700 uppercase tracking-[0.15em] font-bold text-[9px] mb-1">Depois</p>
                  <pre className="bg-black/20 border border-white/[0.06] rounded-xl p-3 text-zinc-500 overflow-auto max-h-40 text-[11px]">
                    {JSON.stringify(log.after_data, null, 2)}
                  </pre>
                </div>
              )}
              {Object.keys(log.metadata ?? {}).length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-zinc-700 uppercase tracking-[0.15em] font-bold text-[9px] mb-1">Metadata</p>
                  <pre className="bg-black/20 border border-white/[0.06] rounded-xl p-3 text-zinc-500 overflow-auto max-h-32 text-[11px]">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function LogsClient({ initialLogs, total, editors }: LogsClientProps) {
  const [logs,           setLogs]           = useState(initialLogs)
  const [totalCount,     setTotalCount]     = useState(total)
  const [offset,         setOffset]         = useState(0)
  const [loading,        setLoading]        = useState(false)
  const [filterAction,   setFilterAction]   = useState('')
  const [filterEntity,   setFilterEntity]   = useState('')
  const [filterActor,    setFilterActor]    = useState('')
  const [filterStart,    setFilterStart]    = useState('')
  const [filterEnd,      setFilterEnd]      = useState('')

  const LIMIT = 50

  async function fetchLogs(newOffset = 0) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterAction) params.set('action',     filterAction)
    if (filterEntity) params.set('entityType', filterEntity)
    if (filterActor)  params.set('actorId',    filterActor)
    if (filterStart)  params.set('startDate',  filterStart)
    if (filterEnd)    params.set('endDate',    filterEnd)
    params.set('limit',  String(LIMIT))
    params.set('offset', String(newOffset))

    const res  = await fetch(`/api/admin/logs?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setTotalCount(data.total ?? 0)
    setOffset(newOffset)
    setLoading(false)
  }

  function clearFilters() {
    setFilterAction('')
    setFilterEntity('')
    setFilterActor('')
    setFilterStart('')
    setFilterEnd('')
    fetchLogs(0)
  }

  const hasFilters = filterAction || filterEntity || filterActor || filterStart || filterEnd

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-1">Sistema</p>
        <h1 className="text-white text-3xl font-black tracking-tight">Logs Operacionais</h1>
        <p className="text-zinc-500 text-sm mt-0.5">{totalCount} eventos registrados</p>
      </div>

      {/* Filters */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-zinc-700" />
          <span className="text-zinc-600 text-xs font-medium">Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-zinc-700 hover:text-zinc-400 ml-auto transition-colors">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-700" />
            <input
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="Ação..."
              className="w-full bg-black/20 border border-white/[0.06] rounded-xl pl-7 pr-3 h-8 text-xs text-zinc-400 placeholder:text-zinc-800 focus:outline-none focus:border-white/20"
            />
          </div>

          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="h-8 bg-black/20 border border-white/[0.06] text-zinc-500 text-xs rounded-lg px-2 focus:outline-none focus:border-white/20"
          >
            <option value="">Todas entidades</option>
            <option value="order">Pedidos</option>
            <option value="editor">Editores</option>
            <option value="payout">Pagamentos</option>
            <option value="client">Clientes</option>
          </select>

          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="h-8 bg-black/20 border border-white/[0.06] text-zinc-500 text-xs rounded-lg px-2 focus:outline-none focus:border-white/20"
          >
            <option value="">Todos atores</option>
            {editors.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
            className="h-8 bg-black/20 border border-white/[0.06] text-zinc-500 text-xs rounded-lg px-2 focus:outline-none focus:border-white/20"
          />

          <input
            type="date"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
            className="h-8 bg-black/20 border border-white/[0.06] text-zinc-500 text-xs rounded-lg px-2 focus:outline-none focus:border-white/20"
          />
        </div>

        <button
          onClick={() => fetchLogs(0)}
          disabled={loading}
          className="mt-3 px-4 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-100 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Filtrar'}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
            <p className="text-zinc-600 text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 px-4 py-3 whitespace-nowrap">Hora</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 px-4 py-3">Ator</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 px-4 py-3">Ação</th>
                  <th className="text-left text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 px-4 py-3">Entidade</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > LIMIT && (
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>{offset + 1}–{Math.min(offset + LIMIT, totalCount)} de {totalCount}</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(offset - LIMIT)}
              disabled={offset === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.1] disabled:opacity-40 transition-colors text-zinc-400"
            >
              ← Anterior
            </button>
            <button
              onClick={() => fetchLogs(offset + LIMIT)}
              disabled={offset + LIMIT >= totalCount || loading}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.1] disabled:opacity-40 transition-colors text-zinc-400"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
