'use client'
import { useState } from 'react'
import { Wallet, TrendingUp, Clock, ArrowDownToLine, X, Check } from 'lucide-react'
import { formatCents, EARNING_STATUS_CONFIG, PAYOUT_STATUS_CONFIG } from '@/types/domain'
import type { EditorWallet, EditorEarning, EditorPayoutRequest } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CarteiraClientProps {
  wallet:   EditorWallet
  earnings: EditorEarning[]
  payouts:  EditorPayoutRequest[]
  settings: { withdrawalFeeCents: number; minimumWithdrawalCents: number }
}

const PIX_TYPES = [
  { value: 'cpf',    label: 'CPF'              },
  { value: 'cnpj',   label: 'CNPJ'             },
  { value: 'email',  label: 'E-mail'           },
  { value: 'phone',  label: 'Telefone'         },
  { value: 'random', label: 'Chave Aleatória'  },
]

function PayoutDrawer({
  wallet, settings, onClose, onSuccess,
}: {
  wallet: EditorWallet; settings: CarteiraClientProps['settings']; onClose: () => void; onSuccess: () => void
}) {
  const [amountStr,  setAmountStr]  = useState('')
  const [pixKey,     setPixKey]     = useState('')
  const [pixType,    setPixType]    = useState('cpf')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100)
  const feeCents    = settings.withdrawalFeeCents
  const netCents    = amountCents - feeCents
  const canRequest  = amountCents >= settings.minimumWithdrawalCents && netCents > 0 && pixKey.trim().length > 0

  async function request() {
    if (!canRequest) return
    setLoading(true)
    setError('')
    const res  = await fetch('/api/editor/payouts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amountCents, pixKey: pixKey.trim(), pixKeyType: pixType }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao solicitar saque'); return }
    onSuccess()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#111113] border-l border-zinc-800 z-50 overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-semibold">Solicitar Saque</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Disponível: <span className="text-emerald-400 font-medium">{formatCents(wallet.balance_available_cents)}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Valor do saque (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
              <Input
                type="number"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                min={settings.minimumWithdrawalCents / 100}
                max={wallet.balance_available_cents / 100}
                step="0.01"
                className="bg-zinc-900 border-zinc-700 text-white h-10 pl-9 placeholder:text-zinc-600"
              />
            </div>
            <p className="text-zinc-600 text-xs">
              Mínimo: {formatCents(settings.minimumWithdrawalCents)}
            </p>
          </div>

          {/* PIX type */}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Tipo de chave PIX</Label>
            <select
              value={pixType}
              onChange={(e) => setPixType(e.target.value)}
              className="w-full h-10 bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 focus:outline-none focus:border-violet-600"
            >
              {PIX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* PIX key */}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Chave PIX</Label>
            <Input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={pixType === 'email' ? 'seu@email.com' : pixType === 'cpf' ? '000.000.000-00' : 'Chave PIX'}
              className="bg-zinc-900 border-zinc-700 text-white h-10 placeholder:text-zinc-600"
            />
          </div>

          {/* Preview */}
          {amountCents > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Valor solicitado</span>
                <span>{formatCents(amountCents)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Taxa de saque</span>
                <span>-{formatCents(feeCents)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2 font-medium">
                <span className="text-zinc-300">Você receberá</span>
                <span className={netCents > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {netCents > 0 ? formatCents(netCents) : '—'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={request}
            disabled={!canRequest || loading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium h-10"
          >
            {loading ? 'Solicitando...' : 'Solicitar Saque'}
          </Button>

          <p className="text-zinc-600 text-xs text-center">
            O saque será analisado pelo admin e o PIX será enviado manualmente.
          </p>
        </div>
      </div>
    </>
  )
}

export default function CarteiraClient({ wallet: initialWallet, earnings, payouts: initialPayouts, settings }: CarteiraClientProps) {
  const [wallet,      setWallet]      = useState(initialWallet)
  const [payouts,     setPayouts]     = useState(initialPayouts)
  const [tab,         setTab]         = useState<'earnings' | 'payouts'>('earnings')
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  async function refreshWallet() {
    const res  = await fetch('/api/editor/wallet')
    const data = await res.json()
    if (data.wallet)  setWallet(data.wallet)
    if (data.payouts) setPayouts(data.payouts)
  }

  const canRequestPayout =
    wallet.balance_available_cents >= settings.minimumWithdrawalCents &&
    !payouts.some((p) => ['pending', 'approved', 'processing'].includes(p.status))

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Minha Carteira</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Seus ganhos e saques</p>
          </div>
          <Button
            onClick={() => setDrawerOpen(true)}
            disabled={!canRequestPayout}
            className="bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Solicitar Saque
          </Button>
        </div>

        {!canRequestPayout && wallet.balance_available_cents < settings.minimumWithdrawalCents && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-400 text-xs">
            Saldo mínimo para saque: {formatCents(settings.minimumWithdrawalCents)} ·
            Atual disponível: {formatCents(wallet.balance_available_cents)}
          </div>
        )}
        {payouts.some((p) => ['pending', 'approved', 'processing'].includes(p.status)) && (
          <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-800/40 text-violet-400 text-xs">
            Você já tem um saque em andamento. Aguarde a conclusão para solicitar novamente.
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Available */}
          <div className="sm:col-span-1 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Disponível</span>
            </div>
            <p className="text-emerald-400 text-4xl font-bold tabular-nums">
              {formatCents(wallet.balance_available_cents)}
            </p>
            <p className="text-zinc-600 text-xs mt-1">Pronto para saque</p>
          </div>

          {/* Pending */}
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-900/50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Pendente</span>
            </div>
            <p className="text-amber-400 text-3xl font-bold tabular-nums">
              {formatCents(wallet.balance_pending_cents)}
            </p>
            <p className="text-zinc-600 text-xs mt-1">Aguardando liberação</p>
          </div>

          {/* Total earned */}
          <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
              </div>
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Total Ganho</span>
            </div>
            <p className="text-zinc-300 text-3xl font-bold tabular-nums">
              {formatCents(wallet.total_earned_cents)}
            </p>
            <p className="text-zinc-600 text-xs mt-1">Histórico completo</p>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b border-zinc-800/60 mb-5">
            {([
              { id: 'earnings', label: `Ganhos (${earnings.length})`  },
              { id: 'payouts',  label: `Saques (${payouts.length})`   },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Earnings tab */}
          {tab === 'earnings' && (
            earnings.length === 0 ? (
              <div className="py-16 text-center">
                <TrendingUp className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Nenhum ganho ainda</p>
                <p className="text-zinc-700 text-xs mt-1">Conclua pedidos para acumular ganhos</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {['Pedido', 'Descrição', 'Valor', 'Status', 'Data'].map((h) => (
                        <th key={h} className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {earnings.map((e) => {
                      const statusCfg = EARNING_STATUS_CONFIG[e.status] ?? EARNING_STATUS_CONFIG.pending
                      return (
                        <tr key={e.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{e.order_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-zinc-300 text-sm">{e.description ?? 'Clipe aprovado'}</td>
                          <td className="px-4 py-3 text-emerald-400 font-medium tabular-nums">{formatCents(e.net_cents)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">
                            {new Date(e.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Payouts tab */}
          {tab === 'payouts' && (
            payouts.length === 0 ? (
              <div className="py-16 text-center">
                <ArrowDownToLine className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Nenhum saque solicitado ainda</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {['Data', 'Solicitado', 'Taxa', 'Líquido', 'Chave PIX', 'Status'].map((h) => (
                        <th key={h} className="text-left text-[11px] uppercase tracking-wide text-zinc-600 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {payouts.map((p) => {
                      const statusCfg = PAYOUT_STATUS_CONFIG[p.status] ?? PAYOUT_STATUS_CONFIG.pending
                      return (
                        <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-zinc-300 tabular-nums">{formatCents(p.amount_requested_cents)}</td>
                          <td className="px-4 py-3 text-red-400 tabular-nums">-{formatCents(p.fee_cents)}</td>
                          <td className="px-4 py-3 text-emerald-400 font-medium tabular-nums">{formatCents(p.amount_net_cents)}</td>
                          <td className="px-4 py-3 text-zinc-400 text-xs font-mono truncate max-w-[120px]">
                            {p.pix_key ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {drawerOpen && (
        <PayoutDrawer
          wallet={wallet}
          settings={settings}
          onClose={() => setDrawerOpen(false)}
          onSuccess={refreshWallet}
        />
      )}
    </>
  )
}
