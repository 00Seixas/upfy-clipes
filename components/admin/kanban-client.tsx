'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type OrderStatus = 'aguardando' | 'em_edicao' | 'aprovacao' | 'entregue'

const VIRALITY_CONFIG = {
  frio: { label: 'Frio', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  morno: { label: 'Morno', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  quente: { label: 'Quente', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  viral: { label: 'Viral', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'aguardando', label: 'Aguardando' },
  { status: 'em_edicao', label: 'Em Edição' },
  { status: 'aprovacao', label: 'Aprovação' },
  { status: 'entregue', label: 'Entregue' },
]

interface KanbanOrder {
  id: string
  status: OrderStatus
  created_at: string
  deadline?: string
  profiles: { id: string; name: string; whatsapp: string } | null
  editor: { name: string } | null
  deliverables: {
    id: string
    clip_number: number
    virality_grade: string
    feedback: string
    r2_key: string
    filename: string
  }[]
}

interface ApprovalModal {
  order: KanbanOrder
  viralityGrade: string
  feedback: string
}

function isUrgent(deadline?: string) {
  if (!deadline) return false
  const diff = new Date(deadline).getTime() - Date.now()
  return diff < 24 * 60 * 60 * 1000 && diff > 0
}

function deadlineColor(deadline?: string) {
  if (!deadline) return 'text-zinc-500'
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff < 0) return 'text-red-400'
  if (diff < 24 * 60 * 60 * 1000) return 'text-red-400'
  if (diff < 48 * 60 * 60 * 1000) return 'text-yellow-400'
  return 'text-green-400'
}

export default function KanbanClient({ orders }: { orders: KanbanOrder[] }) {
  const [approvalModal, setApprovalModal] = useState<ApprovalModal | null>(null)
  const [approving, setApproving] = useState(false)
  const router = useRouter()

  async function handleApprove() {
    if (!approvalModal) return
    setApproving(true)
    await fetch(`/api/admin/orders/${approvalModal.order.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viralityGrade: approvalModal.viralityGrade,
        feedback: approvalModal.feedback,
      }),
    })
    setApprovalModal(null)
    setApproving(false)
    router.refresh()
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.status === col.status)
          return (
            <div key={col.status} className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-sm font-medium">{col.label}</h3>
                <span className="text-zinc-600 text-xs bg-zinc-800 px-2 py-0.5 rounded-full">{colOrders.length}</span>
              </div>
              <div className="space-y-2">
                {colOrders.map(order => {
                  const deliverable = order.deliverables?.[0]
                  const vConfig = deliverable ? VIRALITY_CONFIG[deliverable.virality_grade as keyof typeof VIRALITY_CONFIG] : null
                  const urgent = isUrgent(order.deadline)

                  return (
                    <div key={order.id} className={`bg-zinc-900 rounded-lg p-3 border ${urgent ? 'border-red-900/50' : 'border-zinc-800'}`}>
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <span className="text-white text-xs font-medium">{order.profiles?.name}</span>
                        {deliverable && (
                          <span className="text-zinc-500 text-xs shrink-0">C{deliverable.clip_number}</span>
                        )}
                      </div>
                      {order.editor && (
                        <p className="text-zinc-600 text-xs mb-1.5">{order.editor.name}</p>
                      )}
                      {vConfig && (
                        <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border ${vConfig.color} mb-2`}>
                          {vConfig.label}
                        </span>
                      )}
                      <div className={`flex items-center gap-1 text-xs ${deadlineColor(order.deadline)}`}>
                        {urgent && <AlertTriangle className="w-3 h-3" />}
                        <Clock className="w-3 h-3" />
                        {order.deadline
                          ? new Date(order.deadline).toLocaleDateString('pt-BR')
                          : new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {col.status === 'aprovacao' && deliverable && (
                        <button
                          onClick={() => setApprovalModal({
                            order,
                            viralityGrade: deliverable.virality_grade,
                            feedback: deliverable.feedback,
                          })}
                          className="mt-2 w-full text-xs bg-white text-black py-1 rounded font-medium hover:bg-zinc-100 transition-colors"
                        >
                          Revisar e aprovar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Approval modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-zinc-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-white font-semibold mb-1">Aprovar clipe</h2>
            <p className="text-zinc-400 text-sm mb-5">
              {approvalModal.order.profiles?.name} — Clipe {approvalModal.order.deliverables[0]?.clip_number}
            </p>

            {/* Video preview */}
            <div className="mb-4">
              <a
                href={`/api/clips/${approvalModal.order.deliverables[0]?.id}/download`}
                className="text-xs text-zinc-400 hover:text-white underline"
                target="_blank"
              >
                Baixar clipe para revisar
              </a>
            </div>

            {/* Virality grade */}
            <div className="mb-4">
              <p className="text-zinc-400 text-xs mb-2">Grau de Viralização</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(VIRALITY_CONFIG).map(([k, v]) => (
                  <button key={k}
                    onClick={() => setApprovalModal(m => m ? { ...m, viralityGrade: k } : m)}
                    className={`p-2 rounded border text-xs font-medium transition-colors ${
                      approvalModal.viralityGrade === k ? `${v.color}` : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="mb-5">
              <p className="text-zinc-400 text-xs mb-2">Feedback do especialista</p>
              <textarea
                value={approvalModal.feedback}
                onChange={e => setApprovalModal(m => m ? { ...m, feedback: e.target.value } : m)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 resize-none focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setApprovalModal(null)} className="flex-1 border-zinc-700 text-zinc-300">
                Cancelar
              </Button>
              <Button onClick={handleApprove} disabled={approving} className="flex-1 bg-white text-black hover:bg-zinc-100">
                <Check className="w-4 h-4 mr-1.5" />
                {approving ? 'Aprovando...' : 'Aprovar e entregar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
