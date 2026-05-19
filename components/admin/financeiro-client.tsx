'use client'
import { useState } from 'react'
import { DollarSign, Clock, CheckCircle2, AlertCircle, X, Check } from 'lucide-react'
import { formatCents, PAYOUT_STATUS_CONFIG } from '@/types/domain'
import type { EditorPayoutRequest, PayoutStatus } from '@/types/domain'

interface FinanceiroSummary {
  totalPaidThisMonthCents:   number
  totalPendingCents:         number
  totalProcessingCents:      number
  payoutsAwaitingApproval:   number
}

interface FinanceiroSettings {
  payoutValuePerClipCents:   number
  withdrawalFeeCents:        number
  minimumWithdrawalCents:    number
}

interface FinanceiroClientProps {
  payouts:  EditorPayoutRequest[]
  settings: FinanceiroSettings
  summary:  FinanceiroSummary
}

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf:    'CPF',
  cnpj:   'CNPJ',
  email:  'E-mail',
  phone:  'Telefone',
  random: 'Aleatória',
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ConfirmPayModal({ payout, onClose, onSuccess }: {
  payout: EditorPayoutRequest; onClose: () => void; onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    await fetch(`/api/admin/payouts/${payout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid' }),
    })
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#080809] border border-green-500/20 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <h3 className="text-white font-semibold text-sm">Confirmar Pagamento</h3>
        </div>
        <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Editor</span>
            <span className="text-zinc-200">{payout.editor?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Valor solicitado</span>
            <span className="text-zinc-300">{formatCents(payout.amount_requested_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Taxa</span>
            <span className="text-red-400">-{formatCents(payout.fee_cents)}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-2 mt-2">
            <span className="text-zinc-400 font-medium">Líquido a pagar</span>
            <span className="text-green-400 font-bold">{formatCents(payout.amount_net_cents)}</span>
          </div>
          {payout.pix_key && (
            <div className="flex justify-between">
              <span className="text-zinc-600">PIX ({PIX_TYPE_LABELS[payout.pix_key_type ?? ''] ?? payout.pix_key_type})</span>
              <span className="text-zinc-400 text-xs font-mono">{payout.pix_key}</span>
            </div>
          )}
        </div>
        <p className="text-zinc-600 text-xs mb-4">Esta ação marcará o saque como pago. Certifique-se de ter realizado o PIX antes de confirmar.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white text-sm transition-colors">Cancelar</button>
          <button
            onClick={confirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-white text-black hover:bg-zinc-100 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Confirmando...' : 'Marcar como Pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ payout, onClose, onSuccess }: {
  payout: EditorPayoutRequest; onClose: () => void; onSuccess: () => void
}) {
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)

  async function reject() {
    setLoading(true)
    await fetch(`/api/admin/payouts/${payout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', notes }),
    })
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#080809] border border-red-500/20 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <X className="w-4 h-4 text-red-400" />
          <h3 className="text-white font-semibold text-sm">Rejeitar Saque</h3>
        </div>
        <p className="text-zinc-600 text-xs mb-3">
          Editor: <span className="text-zinc-400">{payout.editor?.name}</span> · {formatCents(payout.amount_net_cents)}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Motivo da rejeição (opcional)..."
          rows={3}
          className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-3 text-zinc-300 text-sm resize-none focus:outline-none focus:border-red-500/30 placeholder:text-zinc-700 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white text-sm transition-colors">Cancelar</button>
          <button
            onClick={reject}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-500/[0.08] border border-red-500/20 text-red-400 hover:bg-red-500/[0.12] text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Rejeitando...' : 'Rejeitar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payout Row ───────────────────────────────────────────────────────────────
function PayoutRow({
  payout,
  onApprove,
  onMarkPaid,
  onReject,
}: {
  payout:    EditorPayoutRequest
  onApprove: (p: EditorPayoutRequest) => void
  onMarkPaid:(p: EditorPayoutRequest) => void
  onReject:  (p: EditorPayoutRequest) => void
}) {
  const statusCfg = PAYOUT_STATUS_CONFIG[payout.status] ?? PAYOUT_STATUS_CONFIG.pending

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <p className="text-zinc-200 text-sm font-medium">{payout.editor?.name ?? '—'}</p>
      </td>
      <td className="px-4 py-3 text-zinc-400 text-sm tabular-nums">
        {formatCents(payout.amount_requested_cents)}
      </td>
      <td className="px-4 py-3 text-red-400 text-sm tabular-nums">
        -{formatCents(payout.fee_cents)}
      </td>
      <td className="px-4 py-3 text-white text-sm font-bold tabular-nums">
        {formatCents(payout.amount_net_cents)}
      </td>
      <td className="px-4 py-3">
        {payout.pix_key ? (
          <div>
            <p className="text-zinc-600 text-xs">{PIX_TYPE_LABELS[payout.pix_key_type ?? ''] ?? payout.pix_key_type}</p>
            <p className="text-zinc-400 text-xs font-mono truncate max-w-[120px]">{payout.pix_key}</p>
          </div>
        ) : (
          <span className="text-zinc-700 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
          {statusCfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">
        {new Date(payout.created_at).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {payout.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(payout)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-zinc-300 hover:bg-white/[0.1] transition-colors"
              >
                <Check className="w-3 h-3" /> Aprovar
              </button>
              <button
                onClick={() => onReject(payout)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-red-500/[0.08] border border-red-500/20 text-red-400 hover:bg-red-500/[0.12] transition-colors"
              >
                <X className="w-3 h-3" /> Rejeitar
              </button>
            </>
          )}
          {payout.status === 'approved' && (
            <button
              onClick={() => onMarkPaid(payout)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-green-500/[0.08] border border-green-500/20 text-green-400 hover:bg-green-500/[0.12] transition-colors"
            >
              <DollarSign className="w-3 h-3" /> Pagar
            </button>
          )}
          {payout.admin_notes && (
            <span className="text-zinc-700 text-[10px] italic truncate max-w-[80px]" title={payout.admin_notes}>
              {payout.admin_notes}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FinanceiroClient({ payouts: initialPayouts, settings, summary: initialSummary }: FinanceiroClientProps) {
  const [payouts,      setPayouts]      = useState(initialPayouts)
  const [summary,      setSummary]      = useState(initialSummary)
  const [tab,          setTab]          = useState<'pending' | 'history'>('pending')
  const [confirmModal, setConfirmModal] = useState<EditorPayoutRequest | null>(null)
  const [rejectModal,  setRejectModal]  = useState<EditorPayoutRequest | null>(null)

  async function refreshPayouts() {
    const res  = await fetch('/api/admin/payouts')
    const data = await res.json()
    if (data.payouts) setPayouts(data.payouts)
  }

  async function approve(payout: EditorPayoutRequest) {
    await fetch(`/api/admin/payouts/${payout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    refreshPayouts()
  }

  const pendingPayouts  = payouts.filter((p) => ['pending', 'approved'].includes(p.status))
  const historyPayouts  = payouts.filter((p) => ['paid', 'rejected', 'processing'].includes(p.status))

  const summaryCards = [
    {
      label: 'Pago este mês',
      value: formatCents(summary.totalPaidThisMonthCents),
      icon:  CheckCircle2,
      color: 'text-green-400',
      dot:   'bg-green-400/30',
    },
    {
      label: `Aguardando (${summary.payoutsAwaitingApproval})`,
      value: formatCents(summary.totalPendingCents),
      icon:  Clock,
      color: 'text-amber-400',
      dot:   'bg-amber-400/30',
    },
    {
      label: 'Em processamento',
      value: formatCents(summary.totalProcessingCents),
      icon:  AlertCircle,
      color: 'text-zinc-400',
      dot:   'bg-zinc-600/30',
    },
    {
      label: 'Total pendente',
      value: formatCents(summary.totalPendingCents + summary.totalProcessingCents),
      icon:  DollarSign,
      color: 'text-white',
      dot:   'bg-white/10',
    },
  ]

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-[#080809] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 10% 50%, rgba(255,255,255,0.015) 0%, transparent 70%)' }} />
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Admin</p>
          <h1 className="text-white text-3xl font-black tracking-tight">Financeiro</h1>
          <p className="text-zinc-500 text-sm mt-1">Pagamentos de editores</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-zinc-600 text-xs">{card.label}</p>
                <div className={`w-6 h-6 rounded-full ${card.dot} flex items-center justify-center shrink-0`}>
                  <card.icon className={`w-3 h-3 ${card.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-black tabular-nums tracking-tight ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-4">Configurações Operacionais</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-zinc-600 text-xs mb-1">Valor por clipe aprovado</p>
              <p className="text-green-400 text-lg font-bold">{formatCents(settings.payoutValuePerClipCents)}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs mb-1">Taxa de saque</p>
              <p className="text-amber-400 text-lg font-bold">{formatCents(settings.withdrawalFeeCents)}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs mb-1">Mínimo para saque</p>
              <p className="text-zinc-300 text-lg font-bold">{formatCents(settings.minimumWithdrawalCents)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b border-white/[0.04] mb-5">
            {([
              { id: 'pending', label: `Aguardando (${pendingPayouts.length})` },
              { id: 'history', label: 'Histórico' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-white/40 text-white'
                    : 'border-transparent text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            {(tab === 'pending' ? pendingPayouts : historyPayouts).length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-zinc-600 text-sm">
                  {tab === 'pending' ? 'Nenhum saque aguardando aprovação' : 'Sem histórico ainda'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Editor', 'Solicitado', 'Taxa', 'Líquido', 'Chave PIX', 'Status', 'Data', 'Ações'].map((h) => (
                        <th key={h} className="text-left text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === 'pending' ? pendingPayouts : historyPayouts).map((p) => (
                      <PayoutRow
                        key={p.id}
                        payout={p}
                        onApprove={approve}
                        onMarkPaid={(payout) => setConfirmModal(payout)}
                        onReject={(payout) => setRejectModal(payout)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmModal && (
        <ConfirmPayModal
          payout={confirmModal}
          onClose={() => setConfirmModal(null)}
          onSuccess={refreshPayouts}
        />
      )}
      {rejectModal && (
        <RejectModal
          payout={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={refreshPayouts}
        />
      )}
    </>
  )
}
