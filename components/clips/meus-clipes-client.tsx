'use client'
import { useState, useEffect } from 'react'
import { ChevronRight, FolderOpen, Film, Download, ArrowLeft, Loader2, Play, CheckCircle2, XCircle } from 'lucide-react'
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

interface SocialPlatformStatus {
  connected: boolean
  username?: string
}

interface SocialStatus {
  tiktok: SocialPlatformStatus
  instagram: SocialPlatformStatus
}

type PostedPlatforms = Partial<Record<'tiktok' | 'instagram', boolean>>
type PostErrors = Partial<Record<'tiktok' | 'instagram', string>>
type Posting = Partial<Record<'tiktok' | 'instagram', boolean>>

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

function defaultCaption(clipNumber: number) {
  return `Clipe #${clipNumber} 🎬\n\n#shorts #viral #conteudo`
}

// Simple TikTok icon using SVG path
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.8 1.54V6.78a4.85 4.85 0 0 1-1.03-.09z"/>
    </svg>
  )
}

// Simple Instagram icon
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

interface SocialPanelProps {
  clip: Deliverable
  socialStatus: SocialStatus | null
  loadingSocial: boolean
}

function SocialPanel({ clip, socialStatus, loadingSocial }: SocialPanelProps) {
  const [captions, setCaptions] = useState({
    tiktok: defaultCaption(clip.clip_number),
    instagram: defaultCaption(clip.clip_number),
  })
  const [posting, setPosting] = useState<Posting>({})
  const [posted, setPosted] = useState<PostedPlatforms>({})
  const [errors, setErrors] = useState<PostErrors>({})

  async function handlePost(platform: 'tiktok' | 'instagram') {
    setPosting(p => ({ ...p, [platform]: true }))
    setErrors(e => ({ ...e, [platform]: undefined }))
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId: clip.id, platform, caption: captions[platform] }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setErrors(e => ({ ...e, [platform]: data.error ?? 'Erro ao postar' }))
      } else {
        setPosted(p => ({ ...p, [platform]: true }))
      }
    } catch {
      setErrors(e => ({ ...e, [platform]: 'Erro de conexão' }))
    } finally {
      setPosting(p => ({ ...p, [platform]: false }))
    }
  }

  if (loadingSocial) {
    return (
      <div className="mt-5 pt-5 border-t border-zinc-800/60">
        <p className="text-zinc-500 text-xs mb-3 font-medium uppercase tracking-wider">Postar nas Redes</p>
        <div className="flex items-center gap-2 text-zinc-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Verificando conexões...</span>
        </div>
      </div>
    )
  }

  if (!socialStatus) return null

  const platforms: Array<{ key: 'tiktok' | 'instagram'; label: string; connectLabel: string; postLabel: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'tiktok',    label: 'TikTok',    connectLabel: 'Conectar TikTok',    postLabel: 'Postar no TikTok',    Icon: TikTokIcon    },
    { key: 'instagram', label: 'Instagram', connectLabel: 'Conectar Instagram', postLabel: 'Postar no Instagram', Icon: InstagramIcon },
  ]

  return (
    <div className="mt-5 pt-5 border-t border-zinc-800/60">
      <p className="text-zinc-500 text-xs mb-4 font-medium uppercase tracking-wider">Postar nas Redes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {platforms.map(({ key, label, connectLabel, postLabel, Icon }) => {
          const status = socialStatus[key]
          const isPosting = posting[key] ?? false
          const hasPosted = posted[key] ?? false
          const errMsg = errors[key]

          return (
            <div
              key={key}
              className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-zinc-400" />
                <span className="text-white text-sm font-medium">{label}</span>
                {hasPosted && (
                  <span className="ml-auto flex items-center gap-1 text-green-400 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Postado
                  </span>
                )}
              </div>

              {status.connected ? (
                <>
                  <p className="text-zinc-500 text-xs">@{status.username || 'conta conectada'}</p>
                  {!hasPosted && (
                    <>
                      <textarea
                        value={captions[key]}
                        onChange={e => setCaptions(c => ({ ...c, [key]: e.target.value }))}
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 text-xs resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-700"
                        placeholder="Legenda..."
                        disabled={isPosting}
                      />
                      <button
                        onClick={() => handlePost(key)}
                        disabled={isPosting}
                        className="flex items-center justify-center gap-1.5 text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
                      >
                        {isPosting ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Postando...</>
                        ) : (
                          postLabel
                        )}
                      </button>
                    </>
                  )}
                  {hasPosted && (
                    <p className="text-green-400 text-xs">Publicado com sucesso!</p>
                  )}
                  {errMsg && (
                    <div className="flex items-start gap-1.5 text-red-400 text-xs">
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{errMsg}</span>
                    </div>
                  )}
                </>
              ) : (
                <a
                  href={`/api/social/connect/${key}`}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  {connectLabel} →
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MeusClipesClient({ deliverables }: { deliverables: Deliverable[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedClip, setSelectedClip]   = useState<Deliverable | null>(null)
  const [videoUrl, setVideoUrl]           = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo]   = useState(false)
  const [socialStatus, setSocialStatus]   = useState<SocialStatus | null>(null)
  const [loadingSocial, setLoadingSocial] = useState(false)

  useEffect(() => {
    if (!selectedClip) { setVideoUrl(null); return }
    setLoadingVideo(true)
    fetch(`/api/clips/${selectedClip.id}/stream`)
      .then(r => r.json())
      .then(({ url }: { url: string }) => setVideoUrl(url))
      .catch(() => setVideoUrl(null))
      .finally(() => setLoadingVideo(false))
  }, [selectedClip])

  // Load social status when clip detail is opened
  useEffect(() => {
    if (!selectedClip) return
    setLoadingSocial(true)
    fetch('/api/social/status')
      .then(r => r.json())
      .then((data: SocialStatus) => setSocialStatus(data))
      .catch(() => setSocialStatus(null))
      .finally(() => setLoadingSocial(false))
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

            {/* Social posting section */}
            <SocialPanel
              clip={selectedClip}
              socialStatus={socialStatus}
              loadingSocial={loadingSocial}
            />
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
