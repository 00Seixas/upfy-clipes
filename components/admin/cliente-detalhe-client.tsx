'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const VIRALITY_CONFIG = {
  frio: { label: 'Frio', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  morno: { label: 'Morno', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  quente: { label: 'Quente', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  viral: { label: 'Viral', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
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
      <Link href="/clientes" className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Clientes
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">{profile.name}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{profile.whatsapp}</p>
        </div>
        <div className="flex gap-2">
          {(contract?.status === 'encerrando' || contract?.status === 'aguardando_renovacao') && (
            <Button size="sm" onClick={sendRenewal} disabled={actionLoading === 'renewal'}
              className="bg-white text-black hover:bg-zinc-100 text-xs h-8">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Enviar link de renovação
            </Button>
          )}
          {contract?.status === 'aguardando_renovacao' && (
            <Button size="sm" variant="outline" onClick={startFollowup} disabled={actionLoading === 'followup'}
              className="border-zinc-700 text-zinc-300 text-xs h-8">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Iniciar follow up
            </Button>
          )}
          {contract?.status !== 'encerrado' && (
            <Button size="sm" variant="outline" onClick={closeContract} disabled={actionLoading === 'close'}
              className="border-red-900/50 text-red-400 hover:bg-red-950/30 text-xs h-8">
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Encerrar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Status</p>
          <p className="text-white text-sm font-medium">{STATUS_LABELS[contract?.status ?? 'encerrado']}</p>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Dias restantes</p>
          <p className="text-white text-sm font-medium">{daysLeft} dias</p>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Progresso</p>
          <p className="text-white text-sm font-medium">{contract?.clips_delivered ?? 0}/{contract?.clips_total ?? 0} clipes</p>
        </div>
      </div>

      {/* Progress bar */}
      {contract && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs">Progresso do contrato</p>
            <p className="text-zinc-400 text-xs">{progress}%</p>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5">
            <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-zinc-600 text-xs">{new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
            <p className="text-zinc-600 text-xs">{new Date(contract.end_date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      )}

      {/* Delivery history */}
      {deliverables.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-white text-sm font-medium mb-4">Histórico de clipes</h2>
          <div className="space-y-2">
            {deliverables.map(d => {
              const vConfig = VIRALITY_CONFIG[d.virality_grade as keyof typeof VIRALITY_CONFIG]
              return (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-white text-sm w-16 shrink-0">Clipe {d.clip_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${vConfig?.color}`}>{vConfig?.label}</span>
                  <span className="text-zinc-400 text-sm flex-1 truncate">{d.feedback}</span>
                  <span className="text-zinc-500 text-xs shrink-0">{new Date(d.delivered_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* WhatsApp log */}
      {whatsappLogs.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-white text-sm font-medium mb-4">Mensagens WhatsApp</h2>
          <div className="space-y-2">
            {whatsappLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${
                  log.status === 'enviado' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>{log.status}</span>
                <p className="text-zinc-400 text-xs flex-1 line-clamp-2">{log.message}</p>
                <p className="text-zinc-600 text-xs shrink-0">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {contract?.notes && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white text-sm font-medium mb-2">Observações internas</h2>
          <p className="text-zinc-400 text-sm">{contract.notes}</p>
        </div>
      )}
    </div>
  )
}
