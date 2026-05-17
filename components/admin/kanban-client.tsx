'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, Check, Upload, Film, Music, Megaphone, Palette, FileText, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type OrderStatus = 'aguardando' | 'em_edicao' | 'aprovacao' | 'entregue'
type ViralityGrade = 'frio' | 'morno' | 'quente' | 'viral'

const VIRALITY_CONFIG = {
  frio:      { label: 'Frio',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  morno:     { label: 'Morno',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  quente:    { label: 'Quente',  color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  viral:     { label: 'Viral 🔥', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

const TONE_LABELS: Record<string, string> = {
  'engraçado': '😄 Engraçado', educativo: '📚 Educativo',
  inspiracional: '💡 Inspiracional', 'polêmico': '🔥 Polêmico',
}
const CTA_LABELS: Record<string, string> = {
  segue_la: '👆 Segue lá', link_na_bio: '🔗 Link na bio', nenhum: '— Nenhum',
}

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'aguardando', label: 'Aguardando' },
  { status: 'em_edicao',  label: 'Em Edição' },
  { status: 'aprovacao',  label: 'Aprovação' },
  { status: 'entregue',   label: 'Entregue' },
]

interface KanbanOrder {
  id: string
  status: OrderStatus
  briefing: Record<string, string>
  created_at: string
  deadline?: string
  profiles: { id: string; name: string; whatsapp: string } | null
  editor: { name: string } | null
  videos?: { id: string; r2_key: string; filename: string; size_bytes?: number }[]
  deliverables: {
    id: string
    clip_number: number
    virality_grade: string
    feedback: string
    r2_key: string
    filename: string
  }[]
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
  const [approvalModal, setApprovalModal] = useState<{ order: KanbanOrder; viralityGrade: string; feedback: string } | null>(null)
  const [editModal, setEditModal]         = useState<KanbanOrder | null>(null)
  const [approving, setApproving]         = useState(false)
  const [editState, setEditState]         = useState({ viralityGrade: 'morno' as ViralityGrade, feedback: '', clipFile: null as File | null, uploading: false, error: '' })
  const router = useRouter()

  /* ── Aprovar clipe ── */
  async function handleApprove() {
    if (!approvalModal) return
    setApproving(true)
    await fetch(`/api/admin/orders/${approvalModal.order.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viralityGrade: approvalModal.viralityGrade, feedback: approvalModal.feedback }),
    })
    setApprovalModal(null)
    setApproving(false)
    router.refresh()
  }

  /* ── Admin edita o vídeo ── */
  function openEdit(order: KanbanOrder) {
    setEditModal(order)
    setEditState({ viralityGrade: 'morno', feedback: '', clipFile: null, uploading: false, error: '' })
  }

  async function handleEditSubmit() {
    if (!editModal) return
    if (!editState.clipFile) { setEditState(s => ({ ...s, error: 'Selecione o clipe finalizado.' })); return }
    if (!editState.feedback.trim()) { setEditState(s => ({ ...s, error: 'Preencha o feedback.' })); return }
    setEditState(s => ({ ...s, uploading: true, error: '' }))

    try {
      // 1. Pica o pedido (atribui ao admin)
      const pickRes = await fetch(`/api/orders/${editModal.id}/pick`, { method: 'POST' })
      if (!pickRes.ok) throw new Error('Erro ao pegar pedido')

      // 2. Presigned URL
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: editState.clipFile.name, contentType: editState.clipFile.type }),
      })
      const { signedUrl, key } = await initRes.json()
      if (!signedUrl) throw new Error('Erro ao gerar URL de upload')

      // 3. Upload via XHR direto pro R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl, true)
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`R2 ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Falha na conexão com R2'))
        xhr.send(editState.clipFile)
      })

      // 4. Submete clipe
      const submitRes = await fetch(`/api/orders/${editModal.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Key: key, filename: editState.clipFile.name, viralityGrade: editState.viralityGrade, feedback: editState.feedback }),
      })
      if (!submitRes.ok) throw new Error('Erro ao submeter')

      // 5. Aprova automaticamente (admin não precisa re-aprovar)
      await fetch(`/api/admin/orders/${editModal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viralityGrade: editState.viralityGrade, feedback: editState.feedback }),
      })

      setEditModal(null)
      router.refresh()
    } catch (e) {
      setEditState(s => ({ ...s, uploading: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }))
    }
  }

  return (
    <>
      {/* ── Kanban board ── */}
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
                  const vConfig = deliverable ? VIRALITY_CONFIG[deliverable.virality_grade as ViralityGrade] : null
                  const urgent = isUrgent(order.deadline)
                  const briefing = order.briefing ?? {}

                  return (
                    <div key={order.id} className={`bg-zinc-900 rounded-lg p-3 border ${urgent ? 'border-red-900/50' : 'border-zinc-800'}`}>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-white text-xs font-semibold">{order.profiles?.name}</span>
                        {deliverable && <span className="text-zinc-500 text-xs shrink-0">C{deliverable.clip_number}</span>}
                      </div>
                      {order.editor && <p className="text-zinc-600 text-xs mb-1">✂️ {order.editor.name}</p>}
                      {briefing.tone && (
                        <p className="text-zinc-500 text-xs mb-1.5">{TONE_LABELS[briefing.tone] ?? briefing.tone}</p>
                      )}
                      {vConfig && (
                        <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border ${vConfig.color} mb-2`}>{vConfig.label}</span>
                      )}
                      <div className={`flex items-center gap-1 text-xs mb-2 ${deadlineColor(order.deadline)}`}>
                        {urgent && <AlertTriangle className="w-3 h-3" />}
                        <Clock className="w-3 h-3" />
                        {order.deadline
                          ? new Date(order.deadline).toLocaleDateString('pt-BR')
                          : new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </div>

                      {/* Botão: admin edita */}
                      {col.status === 'aguardando' && (
                        <button
                          onClick={() => openEdit(order)}
                          className="w-full text-xs bg-zinc-700 hover:bg-zinc-600 text-white py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3 h-3" />
                          Editar eu mesmo
                        </button>
                      )}

                      {/* Botão: aprovar */}
                      {col.status === 'aprovacao' && deliverable && (
                        <button
                          onClick={() => setApprovalModal({ order, viralityGrade: deliverable.virality_grade, feedback: deliverable.feedback })}
                          className="w-full text-xs bg-white text-black py-1.5 rounded font-medium hover:bg-zinc-100 transition-colors"
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

      {/* ── Modal: Admin edita o vídeo ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => !editState.uploading && setEditModal(null)} />
          <div className="ml-auto w-full max-w-lg bg-[#111113] border-l border-zinc-800 relative z-10 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-[#111113] z-10">
              <div>
                <h2 className="text-white font-semibold">Editar vídeo</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{editModal.profiles?.name}</p>
              </div>
              {!editState.uploading && (
                <button onClick={() => setEditModal(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Briefing completo */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Briefing do cliente</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-zinc-600 text-xs flex items-center gap-1 mb-0.5"><Palette className="w-3 h-3" /> Tom</p>
                    <p className="text-zinc-200 text-sm">{TONE_LABELS[editModal.briefing?.tone] ?? editModal.briefing?.tone ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 text-xs flex items-center gap-1 mb-0.5"><Megaphone className="w-3 h-3" /> CTA</p>
                    <p className="text-zinc-200 text-sm">{CTA_LABELS[editModal.briefing?.cta] ?? editModal.briefing?.cta ?? '—'}</p>
                  </div>
                  {editModal.briefing?.music && (
                    <div>
                      <p className="text-zinc-600 text-xs flex items-center gap-1 mb-0.5"><Music className="w-3 h-3" /> Música</p>
                      <p className="text-zinc-200 text-sm">{editModal.briefing.music}</p>
                    </div>
                  )}
                  {editModal.briefing?.editingStyle && (
                    <div>
                      <p className="text-zinc-600 text-xs flex items-center gap-1 mb-0.5"><Film className="w-3 h-3" /> Estilo</p>
                      <p className="text-zinc-200 text-sm">{editModal.briefing.editingStyle}</p>
                    </div>
                  )}
                  {editModal.briefing?.notes && (
                    <div className="col-span-2">
                      <p className="text-zinc-600 text-xs flex items-center gap-1 mb-0.5"><FileText className="w-3 h-3" /> Observações</p>
                      <p className="text-zinc-200 text-sm bg-zinc-800 rounded-lg p-2.5 border border-zinc-700 whitespace-pre-line">{editModal.briefing.notes}</p>
                    </div>
                  )}
                </div>

                {/* Download vídeo bruto */}
                {editModal.videos?.[0] && (
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-zinc-600 text-xs mb-2">Vídeo bruto do cliente</p>
                    <a
                      href={`/api/videos/${editModal.videos[0].id}/download`}
                      className="inline-flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar {editModal.videos[0].filename}
                    </a>
                  </div>
                )}
              </div>

              {/* Upload clipe finalizado */}
              <div>
                <Label className="text-zinc-400 text-xs mb-2 block">Upload do clipe finalizado</Label>
                <label className="border border-dashed border-zinc-700 rounded-xl p-5 flex flex-col items-center cursor-pointer hover:border-zinc-500 transition-colors block">
                  <Upload className="w-6 h-6 text-zinc-600 mb-2" />
                  <p className="text-zinc-300 text-sm font-medium">
                    {editState.clipFile ? editState.clipFile.name : 'Selecionar clipe finalizado'}
                  </p>
                  <p className="text-zinc-600 text-xs mt-1">MP4, MOV, AVI</p>
                  <input type="file" accept="video/*" className="hidden"
                    onChange={e => setEditState(s => ({ ...s, clipFile: e.target.files?.[0] ?? null }))} />
                </label>
              </div>

              {/* Grau de viralização */}
              <div>
                <Label className="text-zinc-400 text-xs mb-2 block">Grau de viralização</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(VIRALITY_CONFIG) as [ViralityGrade, typeof VIRALITY_CONFIG[ViralityGrade]][]).map(([k, v]) => (
                    <button key={k} type="button"
                      onClick={() => setEditState(s => ({ ...s, viralityGrade: k }))}
                      className={`p-2.5 rounded-lg border text-center transition-colors ${
                        editState.viralityGrade === k ? v.color : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      <span className="text-xs font-medium">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div>
                <Label className="text-zinc-400 text-xs mb-2 block">Feedback do especialista</Label>
                <textarea
                  value={editState.feedback}
                  onChange={e => setEditState(s => ({ ...s, feedback: e.target.value }))}
                  placeholder="Descreva os pontos fortes e potencial de viralização..."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-zinc-600"
                />
              </div>

              {editState.error && (
                <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">{editState.error}</p>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 sticky bottom-0 bg-[#111113]">
              <Button
                onClick={handleEditSubmit}
                disabled={editState.uploading}
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium h-10"
              >
                {editState.uploading ? 'Enviando e entregando...' : '✓ Enviar clipe e entregar ao cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Aprovar clipe de editor ── */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-zinc-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-white font-semibold mb-1">Aprovar clipe</h2>
            <p className="text-zinc-400 text-sm mb-5">
              {approvalModal.order.profiles?.name} — Clipe {approvalModal.order.deliverables[0]?.clip_number}
            </p>
            <div className="mb-4">
              <a href={`/api/clips/${approvalModal.order.deliverables[0]?.id}/download`}
                className="inline-flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition-colors"
                target="_blank"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar clipe para revisar
              </a>
            </div>
            <div className="mb-4">
              <p className="text-zinc-400 text-xs mb-2">Grau de Viralização</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(VIRALITY_CONFIG) as [string, typeof VIRALITY_CONFIG[ViralityGrade]][]).map(([k, v]) => (
                  <button key={k}
                    onClick={() => setApprovalModal(m => m ? { ...m, viralityGrade: k } : m)}
                    className={`p-2 rounded border text-xs font-medium transition-colors ${
                      approvalModal.viralityGrade === k ? v.color : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <p className="text-zinc-400 text-xs mb-2">Feedback</p>
              <textarea
                value={approvalModal.feedback}
                onChange={e => setApprovalModal(m => m ? { ...m, feedback: e.target.value } : m)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-md px-3 py-2 resize-none focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setApprovalModal(null)} className="flex-1 border-zinc-700 text-zinc-300">Cancelar</Button>
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
