'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, XCircle, RotateCcw } from 'lucide-react'

const VIRALITY_CONFIG = {
  frio:   { label: 'Frio',   color: 'text-blue-400 bg-blue-500/[0.08] border-blue-500/20'     },
  morno:  { label: 'Morno',  color: 'text-amber-400 bg-amber-500/[0.08] border-amber-500/20'  },
  quente: { label: 'Quente', color: 'text-red-400 bg-red-500/[0.08] border-red-500/20'        },
  viral:  { label: 'Viral',  color: 'text-purple-400 bg-purple-500/[0.08] border-purple-500/20' },
}

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  encerrando: 'Encerrando',
  aguardando_renovacao: 'Aguard. renovação',
  encerrado: 'Encerrado',
}

interface Profile { id: string; name: string; whatsapp: string; created_at: string }
interface Contract {
  id: string; clips_total: number; clips_delivered: number;
  start_date: string; end_date: string; status: string;
  payment_link?: string; notes?: string;
}
interface Deliverable {
  id: string; clip_number: number; virality_grade: string; feedback: string; delivered_at: string
}
interface WhatsappLog { id: string; message: string; status: string; created_at: string }

export default function ClienteDetalheClient({
  profile, contract, deliverables, whatsappLogs
}: { profile: Profile; contract: Contract | null; deliverables: Deliverable[]; whatsappLogs: WhatsappLog[] }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  const daysLeft = contract
    ? Math.max(0, Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0
  const progress = contract ? Math.round((contract.clips_delivered / contract.clips_total) * 100) : 0

  async function sendRenewal() {
    if (!contract?.payment_link || !profile.whatsapp) return
    setActionLoading('renewal')
    const message = `Olá ${profile.name}! Seus clipes estão acabando 🎬\nRenove agora e continue crescendo:\n${contract.payment_link}`
    await fetch(`/api/admin/clients/${profile.id}/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    setActionLoading(null)
    router.refresh()
  }

  async function startFollowup() {
    setActionLoading('followup')
    await fetch(`/api/admin/clients/${profile.id}/followup`, { method: 'POST' })
    setActionLoading(null)
    router.refresh()
  }

  async function closeContract() {
    if (!confirm('Encerrar contrato deste cliente?')) return
    setActionLoading('close')
    await fetch(`/api/admin/clients/${profile.id}/close`, { method: 'POST' })
    setActionLoading(null)
    router.push('/clientes')
  }

  return (
    <div>
      <Link href="/clientes" className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Clientes
      </Link>

      {/* Hero client card */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 80% at 0% 50%, rgba(255,255,255,0.015) 0%, transparent 70%)' }} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Cliente</p>
            <h1 className="text-white text-2xl font-black tracking-tight">{profile.name}</h1>
            <p className="text-zinc-600 text-sm mt-1">{profile.whatsapp}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {(contract?.status === 'encerrando' || contract?.status === 'aguardando_renovacao') && (
              <button
                onClick={sendRenewal}
                disabled={actionLoading === 'renewal'}
                className="flex items-center gap-1.5 bg-white text-black hover:bg-zinc-100 text-xs px-3 h-8 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Renovação
              </button>
            )}
            {contract?.status === 'aguardando_renovacao' && (
              <button
                onClick={startFollowup}
                disabled={actionLoading === 'followup'}
                className="flex items-center gap-1.5 border border-white/[0.06] text-zinc-400 hover:text-white text-xs px-3 h-8 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Follow up
              </button>
            )}
            {contract?.status !== 'encerrado' && (
              <button
                onClick={closeContract}
                disabled={actionLoading === 'close'}
                className="flex items-center gap-1.5 border border-red-500/20 text-red-400 hover:bg-red-500/[0.06] text-xs px-3 h-8 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Encerrar
              </button>
            )}
          </div>
        </div>

        {/* 3-column stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Status</p>
            <p className="text-zinc-200 text-sm font-semibold">{STATUS_LABELS[contract?.status ?? 'encerrado']}</p>
          </div>
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Dias restantes</p>
            <p className="text-zinc-200 text-sm font-semibold">{daysLeft}d</p>
          </div>
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Clipes</p>
            <p className="text-zinc-200 text-sm font-semibold">{contract?.clips_delivered ?? 0}/{contract?.clips_total ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {contract && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">Progresso do contrato</p>
            <p className="text-zinc-600 text-xs tabular-nums">{progress}%</p>
          </div>
          <div className="w-full bg-white/[0.04] rounded-full h-1">
            <div className="bg-white/40 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-zinc-700 text-xs">{new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
            <p className="text-zinc-700 text-xs">{new Date(contract.end_date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      )}

      {/* Delivery history */}
      {deliverables.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5 mb-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-4">Histórico de clipes</p>
          <div className="space-y-0">
            {deliverables.map(d => {
              const vConfig = VIRALITY_CONFIG[d.virality_grade as keyof typeof VIRALITY_CONFIG]
              return (
                <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-zinc-500 text-xs w-14 shrink-0 tabular-nums">#{d.clip_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${vConfig?.color}`}>{vConfig?.label}</span>
                  <span className="text-zinc-500 text-xs flex-1 truncate">{d.feedback}</span>
                  <span className="text-zinc-700 text-xs shrink-0">{new Date(d.delivered_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* WhatsApp log */}
      {whatsappLogs.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5 mb-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-4">Mensagens WhatsApp</p>
          <div className="space-y-0">
            {whatsappLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 font-medium ${
                  log.status === 'enviado' ? 'text-green-400 bg-green-500/[0.08] border-green-500/20' : 'text-red-400 bg-red-500/[0.08] border-red-500/20'
                }`}>{log.status}</span>
                <p className="text-zinc-500 text-xs flex-1 line-clamp-2">{log.message}</p>
                <p className="text-zinc-700 text-xs shrink-0">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {contract?.notes && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-3">Observações internas</p>
          <p className="text-zinc-400 text-sm">{contract.notes}</p>
        </div>
      )}
    </div>
  )
}
