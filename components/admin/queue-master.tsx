'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutGrid, List, Search, Filter, AlertTriangle, Crown,
  Clock, ChevronDown, MoreHorizontal, User, X, Check,
  Film, Zap, Flag,
} from 'lucide-react'
import type { EnterpriseOrder, OrderStatus, Priority } from '@/types/domain'
import {
  ORDER_STATUS_CONFIG, PRIORITY_CONFIG, DIFFICULTY_CONFIG,
  getSlaStatus, timeAgo,
} from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EditorInfo {
  id:            string
  name:          string
  workload:      string
  active_orders: number
}

interface QueueMasterProps {
  orders:          EnterpriseOrder[]
  editors:         EditorInfo[]
  currentAdminId:  string
  currentAdminName: string
}

// Kanban columns definition
const KANBAN_COLUMNS = [
  {
    id:       'aguardando',
    label:    'Aguardando',
    statuses: ['aguardando', 'em_analise', 'na_fila'] as OrderStatus[],
    color:    'text-indigo-400',
    bg:       'bg-indigo-950/20',
    border:   'border-indigo-800/40',
  },
  {
    id:       'em_edicao',
    label:    'Em Edição',
    statuses: ['atribuido', 'em_edicao'] as OrderStatus[],
    color:    'text-amber-400',
    bg:       'bg-amber-950/20',
    border:   'border-amber-800/40',
  },
  {
    id:       'revisao',
    label:    'Revisão',
    statuses: ['revisao_interna', 'revisao_solicitada', 'aprovacao'] as OrderStatus[],
    color:    'text-orange-400',
    bg:       'bg-orange-950/20',
    border:   'border-orange-800/40',
  },
  {
    id:       'pronto',
    label:    'Pronto',
    statuses: ['pronto'] as OrderStatus[],
    color:    'text-emerald-400',
    bg:       'bg-emerald-950/20',
    border:   'border-emerald-800/40',
  },
  {
    id:       'entregue',
    label:    'Entregue',
    statuses: ['entregue', 'publicado'] as OrderStatus[],
    color:    'text-green-400',
    bg:       'bg-green-950/20',
    border:   'border-green-800/40',
  },
  {
    id:       'parado',
    label:    'Parado',
    statuses: ['cancelado', 'falhou', 'pausado'] as OrderStatus[],
    color:    'text-zinc-500',
    bg:       'bg-zinc-900/30',
    border:   'border-zinc-800/40',
  },
]

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  aguardando:         ['em_analise', 'na_fila', 'atribuido', 'cancelado'],
  em_analise:         ['na_fila', 'atribuido', 'cancelado'],
  na_fila:            ['atribuido', 'cancelado'],
  atribuido:          ['em_edicao', 'na_fila', 'cancelado'],
  em_edicao:          ['revisao_interna', 'pronto', 'cancelado'],
  revisao_interna:    ['pronto', 'revisao_solicitada', 'em_edicao'],
  pronto:             ['entregue', 'revisao_solicitada'],
  revisao_solicitada: ['em_edicao', 'cancelado'],
  aprovacao:          ['entregue', 'em_edicao'],
  entregue:           ['publicado'],
}

// ─── Assign Editor Modal ──────────────────────────────────────────────────────
function AssignEditorModal({
  orderId, editors, onClose, onSuccess,
}: {
  orderId:   string
  editors:   EditorInfo[]
  onClose:   () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const workloadColors: Record<string, string> = {
    Leve:     'text-emerald-400',
    Moderado: 'text-amber-400',
    Pesado:   'text-orange-400',
    Crítico:  'text-red-400',
  }

  async function assign() {
    if (!selected) return
    setLoading(true)
    await fetch(`/api/admin/orders/${orderId}/action`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'assign_editor', data: { editorId: selected } }),
    })
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#111113] border border-zinc-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Atribuir Editor</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-1.5 mb-4">
          {editors.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                selected === e.id
                  ? 'border-violet-600 bg-violet-950/30'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {e.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{e.name}</p>
                <p className={`text-xs ${workloadColors[e.workload] ?? 'text-zinc-400'}`}>
                  {e.workload} · {e.active_orders} ativos
                </p>
              </div>
              {selected === e.id && <Check className="w-4 h-4 text-violet-400 shrink-0" />}
            </button>
          ))}
          {editors.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">Nenhum editor disponível</p>
          )}
        </div>

        <Button
          onClick={assign}
          disabled={!selected || loading}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium"
        >
          {loading ? 'Atribuindo...' : 'Confirmar'}
        </Button>
      </div>
    </div>
  )
}

// ─── Note Modal ───────────────────────────────────────────────────────────────
function NoteModal({
  orderId, current, onClose, onSuccess,
}: {
  orderId: string; current?: string | null; onClose: () => void; onSuccess: () => void
}) {
  const [note, setNote] = useState(current ?? '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    await fetch(`/api/admin/orders/${orderId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_note', data: { note } }),
    })
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#111113] border border-zinc-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Nota Interna</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Adicione uma nota interna sobre este pedido..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm p-3 resize-none focus:outline-none focus:border-violet-600 placeholder:text-zinc-600 mb-4"
        />
        <Button onClick={save} disabled={!note.trim() || loading} className="w-full bg-violet-600 hover:bg-violet-500 text-white">
          {loading ? 'Salvando...' : 'Salvar nota'}
        </Button>
      </div>
    </div>
  )
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({ orderId, onClose, onSuccess }: { orderId: string; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function cancel() {
    setLoading(true)
    await fetch(`/api/admin/orders/${orderId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', data: { reason } }),
    })
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#111113] border border-red-900/50 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-white font-semibold text-sm">Cancelar Pedido</h3>
        </div>
        <p className="text-zinc-400 text-xs mb-4">Esta ação não pode ser desfeita facilmente. Informe o motivo:</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo do cancelamento..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm p-3 resize-none focus:outline-none focus:border-red-600 placeholder:text-zinc-600 mb-4"
        />
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 border-zinc-700 text-zinc-400 hover:text-white">Voltar</Button>
          <Button onClick={cancel} disabled={loading} className="flex-1 bg-red-700 hover:bg-red-600 text-white">
            {loading ? 'Cancelando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order, editors, onAction,
}: {
  order:    EnterpriseOrder
  editors:  EditorInfo[]
  onAction: () => void
}) {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [noteModal,   setNoteModal]   = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [loading,     setLoading]     = useState(false)

  const statusCfg    = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.aguardando
  const priorityCfg  = PRIORITY_CONFIG[order.priority]   ?? PRIORITY_CONFIG.normal
  const difficultyCfg = DIFFICULTY_CONFIG[order.difficulty] ?? DIFFICULTY_CONFIG.medium
  const sla          = getSlaStatus(order.created_at, order.sla_hours ?? 48, order.status)

  async function doAction(action: string, data?: Record<string, unknown>) {
    setLoading(true)
    setMenuOpen(false)
    await fetch(`/api/admin/orders/${order.id}/action`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, data }),
    })
    setLoading(false)
    onAction()
  }

  const nextStatuses = NEXT_STATUSES[order.status] ?? []

  return (
    <>
      <div className={`relative bg-[#111113] border rounded-xl overflow-hidden transition-all ${
        order.is_urgent ? 'border-red-900/60' : 'border-zinc-800/60'
      } ${loading ? 'opacity-60' : ''}`}>
        {/* Urgent indicator */}
        {order.is_urgent && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500" />
        )}

        <div className="p-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {order.is_urgent && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-950/50 border border-red-800/60 text-red-400 font-medium">
                <AlertTriangle className="w-2.5 h-2.5" /> URGENTE
              </span>
            )}
            {order.is_vip && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-950/50 border border-violet-800/60 text-violet-400 font-medium">
                <Crown className="w-2.5 h-2.5" /> VIP
              </span>
            )}
            {sla.isOverdue && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-950/50 border border-red-800/60 text-red-400 font-medium">
                <Clock className="w-2.5 h-2.5" /> ATRASADO
              </span>
            )}
            {(order.priority === 'high' || order.priority === 'critical') && !order.is_urgent && (
              <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityCfg.color} ${priorityCfg.bg} ${priorityCfg.border}`}>
                <Flag className="w-2.5 h-2.5" /> {priorityCfg.label}
              </span>
            )}
          </div>

          {/* Client + status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {order.profiles?.name ?? 'Cliente'}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3" />
                {order.editor?.name ?? <span className="text-zinc-600 italic">Sem editor</span>}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
              {/* Actions menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-[#1A1A1C] border border-zinc-700 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                      <button onClick={() => { setMenuOpen(false); setAssignModal(true) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors">
                        <User className="w-3.5 h-3.5 text-zinc-500" /> Atribuir editor
                      </button>

                      <button onClick={() => doAction(order.is_urgent ? 'unmark_urgent' : 'mark_urgent')}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
                        {order.is_urgent ? 'Remover urgência' : 'Marcar urgente'}
                      </button>

                      {nextStatuses.length > 0 && (
                        <>
                          <div className="border-t border-zinc-800 my-1" />
                          <p className="text-[10px] text-zinc-600 px-3 py-1 uppercase tracking-wide">Mover para</p>
                          {nextStatuses.map((s) => (
                            <button key={s} onClick={() => doAction('set_status', { status: s })}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ORDER_STATUS_CONFIG[s]?.dot}`} />
                              {ORDER_STATUS_CONFIG[s]?.label}
                            </button>
                          ))}
                        </>
                      )}

                      <div className="border-t border-zinc-800 my-1" />

                      {order.status !== 'pausado' && !['entregue', 'publicado', 'cancelado', 'falhou'].includes(order.status) && (
                        <button onClick={() => doAction('pause')}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors">
                          <span className="w-3.5 h-3.5 flex items-center justify-center text-zinc-500">⏸</span> Pausar
                        </button>
                      )}
                      {order.status === 'pausado' && (
                        <button onClick={() => doAction('resume')}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors">
                          <span className="w-3.5 h-3.5 flex items-center justify-center text-zinc-500">▶</span> Retomar
                        </button>
                      )}

                      <button onClick={() => { setMenuOpen(false); setNoteModal(true) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-colors">
                        <Film className="w-3.5 h-3.5 text-zinc-500" /> Nota interna
                      </button>

                      {!['cancelado', 'entregue', 'publicado'].includes(order.status) && (
                        <button onClick={() => { setMenuOpen(false); setCancelModal(true) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 transition-colors">
                          <X className="w-3.5 h-3.5" /> Cancelar pedido
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3" />
              {order.clips_requested ?? 1} clip{(order.clips_requested ?? 1) !== 1 ? 's' : ''}
            </span>
            <span className={difficultyCfg.color}>{difficultyCfg.label}</span>
            <span className={`ml-auto font-medium ${sla.color}`}>{sla.label}</span>
          </div>

          {/* Briefing snippet */}
          {order.briefing?.tone && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              <span className="text-[11px] bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded">
                {order.briefing.tone}
              </span>
              {order.briefing.music && (
                <span className="text-[11px] bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                  🎵 {order.briefing.music}
                </span>
              )}
            </div>
          )}

          {/* Internal note indicator */}
          {order.internal_notes && (
            <div className="mt-2.5 text-[11px] text-zinc-600 italic truncate border-t border-zinc-800/40 pt-2">
              📝 {order.internal_notes}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/40 flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">{timeAgo(order.created_at)}</span>
          </div>
        </div>
      </div>

      {assignModal && (
        <AssignEditorModal
          orderId={order.id}
          editors={editors}
          onClose={() => setAssignModal(false)}
          onSuccess={onAction}
        />
      )}
      {noteModal && (
        <NoteModal
          orderId={order.id}
          current={order.internal_notes}
          onClose={() => setNoteModal(false)}
          onSuccess={onAction}
        />
      )}
      {cancelModal && (
        <CancelModal
          orderId={order.id}
          onClose={() => setCancelModal(false)}
          onSuccess={onAction}
        />
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QueueMaster({
  orders: initialOrders, editors, currentAdminId, currentAdminName,
}: QueueMasterProps) {
  const router = useRouter()
  const [orders,      setOrders]      = useState(initialOrders)
  const [view,        setView]        = useState<'kanban' | 'list'>('kanban')
  const [search,      setSearch]      = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterEditor, setFilterEditor] = useState<string>('')

  function handleAction() {
    router.refresh()
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          o.profiles?.name?.toLowerCase().includes(q) ||
          o.editor?.name?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterStatus   && o.status   !== filterStatus)   return false
      if (filterPriority && o.priority !== filterPriority)  return false
      if (filterEditor   && o.editor_id !== filterEditor)   return false
      return true
    })
  }, [orders, search, filterStatus, filterPriority, filterEditor])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Fila Operacional</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{orders.length} pedidos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`p-2 rounded-lg border transition-colors ${view === 'kanban' ? 'bg-violet-950/40 border-violet-700 text-violet-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg border transition-colors ${view === 'list' ? 'bg-violet-950/40 border-violet-700 text-violet-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente ou editor..."
            className="bg-zinc-900 border-zinc-800 text-white pl-9 h-8 text-sm placeholder:text-zinc-600"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 focus:outline-none focus:border-violet-600"
        >
          <option value="">Todos status</option>
          {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-8 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 focus:outline-none focus:border-violet-600"
        >
          <option value="">Todas prioridades</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterEditor}
          onChange={(e) => setFilterEditor(e.target.value)}
          className="h-8 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 focus:outline-none focus:border-violet-600"
        >
          <option value="">Todos editores</option>
          <option value="none">Sem editor</option>
          {editors.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        {(search || filterStatus || filterPriority || filterEditor) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterEditor('') }}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = filtered.filter((o) => col.statuses.includes(o.status))
            return (
              <div key={col.id} className="shrink-0 w-72">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${col.bg} border ${col.border} mb-3`}>
                  <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${col.bg} border ${col.border} ${col.color} tabular-nums`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800/40 border-dashed py-8 text-center">
                      <p className="text-zinc-700 text-xs">Vazio</p>
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        editors={editors}
                        onAction={handleAction}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Filter className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  {['Cliente', 'Editor', 'Status', 'Prioridade', 'Clips', 'SLA', 'Criado', 'Ações'].map((h) => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filtered.map((order) => {
                  const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.aguardando
                  const sla = getSlaStatus(order.created_at, order.sla_hours ?? 48, order.status)
                  return (
                    <tr key={order.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-medium">{order.profiles?.name ?? '—'}</span>
                          {order.is_urgent && <AlertTriangle className="w-3 h-3 text-red-400" />}
                          {order.is_vip && <Crown className="w-3 h-3 text-violet-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{order.editor?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${PRIORITY_CONFIG[order.priority]?.color ?? 'text-zinc-400'}`}>
                        {PRIORITY_CONFIG[order.priority]?.label ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{order.clips_requested ?? 1}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${sla.color}`}>{sla.label}</td>
                      <td className="px-4 py-3 text-zinc-600 text-xs">{timeAgo(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <OrderCard order={order} editors={editors} onAction={handleAction} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
