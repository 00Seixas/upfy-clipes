'use client'
import { useState, useRef } from 'react'
import { CheckCircle, RotateCcw, Play, Pause, Loader2, Video, Clock, User, MessageSquare, X } from 'lucide-react'

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
  frio:   { label: 'Frio',   color: 'text-blue-400',   bg: 'bg-blue-500/[0.08] border-blue-500/20' },
  morno:  { label: 'Morno',  color: 'text-amber-400',  bg: 'bg-amber-500/[0.08] border-amber-500/20' },
  quente: { label: 'Quente', color: 'text-red-400',    bg: 'bg-red-500/[0.08] border-red-500/20' },
  viral:  { label: 'Viral',  color: 'text-purple-400', bg: 'bg-purple-500/[0.08] border-purple-500/20' },
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
  const [streamUrl, setStreamUrl]         = useState<string | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)
  const [approving, setApproving]         = useState(false)
  const [rejecting, setRejecting]         = useState(false)
  const [showVideo, setShowVideo]         = useState(false)
  const [revisionModal, setRevisionModal] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [error, setError]                 = useState<string | null>(null)
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
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${d.orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viralityGrade: d.viralityGrade, feedback: d.feedback }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Erro ao aprovar clipe')
        return
      }
      onRemove(d.id)
    } finally {
      setApproving(false)
    }
  }

  async function submitRevision() {
    if (!revisionNotes.trim()) return
    setRejecting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${d.orderId}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: revisionNotes }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Erro ao solicitar revisão')
        return
      }
      setRevisionModal(false)
      setRevisionNotes('')
      onRemove(d.id)
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.1] transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.04] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Video className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-zinc-200 text-sm font-semibold">Clipe #{d.clipNumber}</p>
            <p className="text-zinc-600 text-xs truncate max-w-[200px]">{d.filename}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${v.bg} ${v.color}`}>
          {v.label}
        </span>
      </div>

      {/* Video preview */}
      {showVideo && streamUrl && (
        <div className="bg-black aspect-video">
          <video ref={videoRef} src={streamUrl} controls autoPlay className="w-full h-full" />
        </div>
      )}

      {/* Body */}
      <div className="p-5 space-y-3">
        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 text-zinc-400">
            <User className="w-3 h-3" /> {d.clientName}
          </span>
          <span className="flex items-center gap-1 text-zinc-600">
            <User className="w-3 h-3" />
            <span className="text-zinc-600">{d.editorName}</span>
          </span>
          <span className="flex items-center gap-1 text-zinc-700">
            <Clock className="w-3 h-3" /> {timeAgo(d.deliveredAt)}
          </span>
        </div>

        {/* Editor feedback */}
        {d.feedback && (
          <div className="bg-black/20 border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Feedback do editor
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed">{d.feedback}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Revision modal inline */}
        {revisionModal && (
          <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-zinc-200 text-sm font-semibold">O que precisa ser corrigido?</p>
              <button
                onClick={() => { setRevisionModal(false); setRevisionNotes('') }}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Descreva o que o editor precisa ajustar no clipe..."
              rows={3}
              className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-4 py-3 text-zinc-300 text-sm placeholder:text-zinc-700 resize-none focus:outline-none focus:border-white/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRevisionModal(false); setRevisionNotes('') }}
                className="flex-1 py-2 rounded-lg border border-white/[0.06] text-zinc-500 text-xs font-medium transition-colors hover:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={submitRevision}
                disabled={rejecting || !revisionNotes.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/[0.12] text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {rejecting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RotateCcw className="w-3.5 h-3.5" />
                }
                Enviar para Revisão
              </button>
            </div>
          </div>
        )}

        {/* Action buttons — hidden while revision modal is open */}
        {!revisionModal && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={loadStream}
              disabled={loadingStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-zinc-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loadingStream
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : showVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />
              }
              {showVideo ? 'Esconder' : 'Preview'}
            </button>

            <div className="flex-1" />

            <button
              onClick={() => { setError(null); setRevisionModal(true) }}
              disabled={approving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Pedir Revisão
            </button>

            <button
              onClick={approve}
              disabled={approving || rejecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-100 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Aprovar
            </button>
          </div>
        )}
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
      {/* Hero header */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 10% 50%, rgba(255,255,255,0.015) 0%, transparent 70%)' }} />
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Operações</p>
        <h1 className="text-white text-3xl font-black tracking-tight">Central de Aprovação</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {items.length === 0
            ? 'Nenhum clipe aguardando'
            : `${items.length} clipe${items.length > 1 ? 's' : ''} aguardando revisão`}
        </p>
        {items.length > 0 && (
          <span className="absolute top-6 right-6 text-xs bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-medium">
            {items.length} pendente{items.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/[0.06] border border-green-500/[0.15] flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-white font-semibold text-lg">Tudo aprovado!</p>
          <p className="text-zinc-600 text-sm mt-1">Nenhum clipe aguardando sua revisão.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((d) => (
          <DeliverableCard key={d.id} d={d} onRemove={remove} />
        ))}
      </div>
    </div>
  )
}
