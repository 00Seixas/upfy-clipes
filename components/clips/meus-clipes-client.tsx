'use client'
import { useState, useEffect } from 'react'
import { ChevronRight, Folder, FolderOpen, Film, Download, ArrowLeft, Loader2, Play } from 'lucide-react'
import type { ViralityGrade } from '@/types'

interface Deliverable {
  id: string
  clip_number: number
  virality_grade: ViralityGrade
  feedback: string
  delivered_at: string
  r2_key: string
  filename: string
}

const VIRALITY_CONFIG: Record<ViralityGrade, { label: string; color: string }> = {
  frio:   { label: '❄️ Frio',   color: 'bg-zinc-800/60 text-zinc-300 border-zinc-700' },
  morno:  { label: '🌤 Morno',  color: 'bg-amber-950/40 text-amber-300 border-amber-800' },
  quente: { label: '🔥 Quente', color: 'bg-orange-950/40 text-orange-300 border-orange-800' },
  viral:  { label: '🚀 Viral',  color: 'bg-green-950/40 text-green-300 border-green-800' },
}

function groupByMonth(deliverables: Deliverable[]) {
  const months: Record<string, Deliverable[]> = {}
  for (const d of deliverables) {
    const month = new Date(d.delivered_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!months[month]) months[month] = []
    months[month].push(d)
  }
  return months
}

export default function MeusClipesClient({ deliverables }: { deliverables: Deliverable[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedClip, setSelectedClip] = useState<Deliverable | null>(null)
  const [videoUrl, setVideoUrl]         = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false)

  useEffect(() => {
    if (!selectedClip) { setVideoUrl(null); return }
    setLoadingVideo(true)
    fetch(`/api/clips/${selectedClip.id}/stream`)
      .then(r => r.json())
      .then(({ url }) => setVideoUrl(url))
      .catch(() => setVideoUrl(null))
      .finally(() => setLoadingVideo(false))
  }, [selectedClip])

  const grouped = groupByMonth(deliverables)
  const months  = Object.keys(grouped)

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Film className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-zinc-400 font-medium">Nenhum clipe entregue ainda</p>
        <p className="text-zinc-600 text-sm mt-1">Seus clipes aparecem aqui depois de aprovados.</p>
      </div>
    )
  }

  // Clip detail view
  if (selectedClip) {
    const vConfig = VIRALITY_CONFIG[selectedClip.virality_grade]
    return (
      <div>
        <button
          onClick={() => setSelectedClip(null)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-[#111113] border border-zinc-800 rounded-xl overflow-hidden">
          {/* Video player */}
          <div className="bg-black aspect-video flex items-center justify-center">
            {loadingVideo && (
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs">Carregando vídeo...</span>
              </div>
            )}
            {!loadingVideo && videoUrl && (
              <video src={videoUrl} controls autoPlay className="w-full h-full" />
            )}
            {!loadingVideo && !videoUrl && (
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <Play className="w-8 h-8" />
                <span className="text-xs">Vídeo indisponível</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Clipe #{selectedClip.clip_number}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${vConfig.color}`}>
                {vConfig.label}
              </span>
            </div>

            {selectedClip.feedback && (
              <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-lg p-3 mb-4">
                <p className="text-zinc-500 text-xs mb-1">Análise do especialista</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{selectedClip.feedback}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-zinc-600 text-xs">
                {new Date(selectedClip.delivered_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })}
              </p>
              <a
                href={`/api/clips/${selectedClip.id}/download`}
                className="flex items-center gap-1.5 text-sm text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Month view (shows clips directly)
  if (selectedMonth) {
    const clips = grouped[selectedMonth]
    return (
      <div>
        <button
          onClick={() => setSelectedMonth(null)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Todos os meses
        </button>
        <h2 className="text-white font-medium mb-4 capitalize">{selectedMonth}</h2>
        <div className="space-y-2">
          {clips.map(clip => {
            const vConfig = VIRALITY_CONFIG[clip.virality_grade]
            return (
              <button
                key={clip.id}
                onClick={() => setSelectedClip(clip)}
                className="w-full flex items-center gap-3 p-4 bg-[#111113] border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Clipe #{clip.clip_number}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${vConfig.color}`}>
                  {vConfig.label}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Root: months
  return (
    <div className="space-y-2">
      {months.map(month => {
        const count = grouped[month].length
        return (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className="w-full flex items-center gap-3 p-4 bg-[#111113] border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-zinc-500" />
            </div>
            <span className="text-white text-sm flex-1 capitalize">{month}</span>
            <span className="text-zinc-500 text-xs">{count} clipe{count !== 1 ? 's' : ''}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        )
      })}
    </div>
  )
}
