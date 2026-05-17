'use client'
import { useState, useRef } from 'react'
import { CheckCircle, RotateCcw, Play, Pause, Loader2, Video, Clock, User, MessageSquare } from 'lucide-react'

type Deliverable = {
  id: string
  orderId: string
  filename: string
  clipNumber: number
  viralityGrade: 'frio' | 'morno' | 'quente' | 'viral'
  feedback: string
  deliveredAt: string
  clientName: string
  clientWhatsapp: string | null
  editorName: string
  briefing: Record<string, string>
  orderCreatedAt: string
}

const VIRALITY: Record<string, { label: string; color: string; bg: string }> = {
  frio:   { label: '❄️ Frio',   color: 'text-zinc-300',   bg: 'bg-zinc-800/60 border-zinc-700' },
  morno:  { label: '🌤 Morno',  color: 'text-amber-300',  bg: 'bg-amber-950/40 border-amber-800' },
  quente: { label: '🔥 Quente', color: 'text-orange-300', bg: 'bg-orange-950/40 border-orange-800' },
  viral:  { label: '🚀 Viral',  color: 'text-green-300',  bg: 'bg-green-950/40 border-green-800' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (d > 0) return `${d}d atrás`
  if (h > 0) return `${h}h atrás`
  return 'agora há pouco'
}

function DeliverableCard({ d, onRemove }: { d: Deliverable; onRemove: (id: string) => void }) {
  const [streamUrl, setStreamUrl]     = useState<string | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)
  const [approving, setApproving]     = useState(false)
  const [rejecting, setRejecting]     = useState(false)
  const [showVideo, setShowVideo]     = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const v = VIRALITY[d.viralityGrade] ?? VIRALITY.frio

  async function loadStream() {
    if (streamUrl) { setShowVideo((p) => !p); return }
    setLoadingStream(true)
    try {
      const res = await fetch(`/api/clips/${d.id}/stream`)
      const { url } = await res.json()
      setStreamUrl(url)
      setShowVideo(true)
    } finally {
      setLoadingStream(false)
    }
  }

  async function approve() {
    setApproving(true)
    try {
      await fetch(`/api/admin/orders/${d.orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viralityGrade: d.viralityGrade, feedback: d.feedback }),
      })
      onRemove(d.id)
    } finally {
      setApproving(false)
    }
  }

  async function requestRevision() {
    setRejecting(true)
    try {
      await fetch(`/api/admin/orders/${d.orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', data: { status: 'revisao_solicitada' } }),
      })
      onRemove(d.id)
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="bg-[#111113] border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-900/40 border border-violet-800/40 flex items-center justify-center">
            <Video className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Clipe #{d.clipNumber}</p>
            <p className="text-zinc-500 text-xs truncate max-w-[200px]">{d.filename}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${v.bg} ${v.color}`}>
          {v.label}
        </span>
      </div>

      {/* Video preview */}
      {showVideo && streamUrl && (
        <div className="bg-black aspect-video">
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            autoPlay
            className="w-full h-full"
          />
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {d.clientName}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3 text-amber-500" /> {d.editorName}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(d.deliveredAt)}</span>
        </div>

        {/* Feedback */}
        {d.feedback && (
          <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Feedback do editor
            </p>
            <p className="text-zinc-300 text-xs leading-relaxed">{d.feedback}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={loadStream}
            disabled={loadingStream}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loadingStream
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : showVideo
                ? <Pause className="w-3.5 h-3.5" />
                : <Play className="w-3.5 h-3.5" />
            }
            {showVideo ? 'Esconder' : 'Preview'}
          </button>

          <div className="flex-1" />

          <button
            onClick={requestRevision}
            disabled={rejecting || approving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/40 text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Pedir Revisão
          </button>

          <button
            onClick={approve}
            disabled={approving || rejecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-900/40 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Aprovar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AprovacaoClient({ deliverables: initial }: { deliverables: Deliverable[] }) {
  const [items, setItems] = useState(initial)

  function remove(id: string) {
    setItems((p) => p.filter((d) => d.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Aprovação de Clipes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {items.length === 0 ? 'Nenhum clipe aguardando' : `${items.length} clipe${items.length > 1 ? 's' : ''} aguardando revisão`}
          </p>
        </div>
        {items.length > 0 && (
          <span className="text-xs bg-violet-900/40 border border-violet-800/40 text-violet-300 px-2.5 py-1 rounded-full font-medium">
            {items.length} pendente{items.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-white font-semibold text-lg">Tudo aprovado!</p>
          <p className="text-zinc-500 text-sm mt-1">Nenhum clipe aguardando sua revisão.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((d) => (
          <DeliverableCard key={d.id} d={d} onRemove={remove} />
        ))}
      </div>
    </div>
  )
}
