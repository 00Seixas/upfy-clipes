'use client'
import { useState, useEffect } from 'react'
import { Film, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

// ─── Viral System ────────────────────────────────────────────────────────────

const VIRAL_SYSTEM = {
  frio:   { label: 'FRIO',   segments: 3,  color: '#1d4ed8', gradient: false, glow: null,                     textColor: '#3b82f6', potencial: 25000,   views: 8000   },
  morno:  { label: 'MORNO',  segments: 6,  color: '#d97706', gradient: false, glow: 'rgba(217,119,6,0.35)',    textColor: '#f59e0b', potencial: 150000,  views: 50000  },
  quente: { label: 'QUENTE', segments: 8,  color: '#dc2626', gradient: false, glow: 'rgba(220,38,38,0.5)',     textColor: '#ef4444', potencial: 600000,  views: 250000 },
  viral:  { label: 'VIRAL',  segments: 10, color: '',        gradient: true,  glow: 'rgba(124,58,237,0.6)',    textColor: '#a78bfa', potencial: 2000000, views: 800000 },
} as const

type VGrade = keyof typeof VIRAL_SYSTEM

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}K`
  return String(n)
}

function EnergyBar({ grade, size = 'md' }: { grade: VGrade; size?: 'sm' | 'md' }) {
  const cfg = VIRAL_SYSTEM[grade]
  const total = 10
  const barH = size === 'sm' ? 10 : 14

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[3px] items-end">
        {Array.from({ length: total }).map((_, i) => {
          const active = i < cfg.segments
          const h = size === 'sm' ? barH : barH + i * 1
          return (
            <div
              key={i}
              className={`w-[5px] rounded-sm ${cfg.glow && active && grade === 'quente' ? 'animate-quente-pulse' : ''} ${cfg.glow && active && grade === 'viral' ? 'animate-viral-pulse' : ''}`}
              style={{
                height: `${h}px`,
                background: active
                  ? cfg.gradient ? 'linear-gradient(to top, #7c3aed, #ec4899)' : cfg.color
                  : 'rgba(255,255,255,0.04)',
                boxShadow: active && cfg.glow ? `0 0 6px ${cfg.glow}` : 'none',
              }}
            />
          )
        })}
      </div>
      <span className="text-[10px] font-black tracking-[0.15em]" style={{ color: cfg.textColor }}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CofreClip {
  id: string
  clip_number: number
  virality_grade: string
  feedback: string
  delivered_at: string
}

interface SocialPlatformStatus {
  connected: boolean
  username?: string
}

interface SocialStatus {
  tiktok: SocialPlatformStatus
  instagram: SocialPlatformStatus
}

// ─── Social Icons ─────────────────────────────────────────────────────────────

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.8 1.54V6.78a4.85 4.85 0 0 1-1.03-.09z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ─── Inline Social Panel ──────────────────────────────────────────────────────

type Platform = 'tiktok' | 'instagram'

function defaultCaption(clipNumber: number) {
  return `Clipe #${clipNumber} 🎬\n#shorts #viral #conteudo`
}

interface InlineSocialPanelProps {
  clip: CofreClip
  platform: Platform
  socialStatus: SocialStatus | null
  loadingSocial: boolean
  onClose: () => void
}

function InlineSocialPanel({ clip, platform, socialStatus, loadingSocial, onClose }: InlineSocialPanelProps) {
  const [caption, setCaption] = useState(defaultCaption(clip.clip_number))
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platformLabel = platform === 'tiktok' ? 'TikTok' : 'Instagram'
  const Icon = platform === 'tiktok' ? TikTokIcon : InstagramIcon

  async function handlePost() {
    setPosting(true)
    setError(null)
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId: clip.id, platform, caption }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao postar')
      } else {
        setPosted(true)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="mt-3 bg-zinc-900/70 border border-white/[0.08] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-300 text-xs font-medium">{platformLabel}</span>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">✕</button>
      </div>

      {loadingSocial ? (
        <div className="flex items-center gap-2 text-zinc-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">Verificando conexão...</span>
        </div>
      ) : !socialStatus ? null : socialStatus[platform].connected ? (
        <>
          <p className="text-zinc-600 text-[10px]">@{socialStatus[platform].username || 'conta conectada'}</p>
          {posted ? (
            <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Postado ✓
            </div>
          ) : (
            <>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                disabled={posting}
                className="w-full bg-zinc-950 border border-white/[0.06] rounded-lg px-3 py-2 text-zinc-300 text-xs resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-700"
                placeholder="Legenda..."
              />
              {error && (
                <div className="flex items-start gap-1.5 text-red-400 text-xs">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button
                onClick={handlePost}
                disabled={posting}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
              >
                {posting ? <><Loader2 className="w-3 h-3 animate-spin" /> Postando...</> : 'Postar agora'}
              </button>
            </>
          )}
        </>
      ) : (
        <a
          href={`/api/social/connect/${platform}`}
          className="flex items-center justify-center gap-1.5 text-xs font-medium border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-lg transition-colors"
        >
          Conectar {platformLabel} →
        </a>
      )}
    </div>
  )
}

// ─── Clip Card ────────────────────────────────────────────────────────────────

function ClipCard({ clip, socialStatus, loadingSocial }: {
  clip: CofreClip
  socialStatus: SocialStatus | null
  loadingSocial: boolean
}) {
  const grade = (clip.virality_grade in VIRAL_SYSTEM ? clip.virality_grade : 'frio') as VGrade
  const cfg = VIRAL_SYSTEM[grade]
  const [openPanel, setOpenPanel] = useState<Platform | null>(null)

  function togglePanel(p: Platform) {
    setOpenPanel(prev => (prev === p ? null : p))
  }

  return (
    <div
      className="bg-[#080809] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-5 transition-all duration-200"
      style={cfg.glow ? { boxShadow: `0 0 40px rgba(${grade === 'viral' ? '124,58,237' : grade === 'quente' ? '220,38,38' : grade === 'morno' ? '217,119,6' : '29,78,216'},0.04)` } : {}}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.05] flex items-center justify-center shrink-0">
          <Film className="w-4 h-4 text-zinc-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-zinc-200 text-sm font-semibold">Clipe #{clip.clip_number}</span>
            <span className="text-zinc-700 text-xs">{new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="mb-3"><EnergyBar grade={grade} /></div>
          {clip.feedback && <p className="text-zinc-600 text-xs leading-relaxed line-clamp-2 mb-3">{clip.feedback}</p>}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xl font-black tracking-tight" style={{ color: cfg.textColor }}>{fmtViews(cfg.potencial)}</span>
              <span className="text-zinc-700 text-xs ml-1.5">views potenciais</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/clips/${clip.id}/download`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-black text-xs font-semibold rounded-lg transition-colors"
              >
                Baixar
              </a>
              <Link
                href="/enviar-videos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] hover:border-white/[0.15] text-zinc-500 hover:text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" /> Similar
              </Link>
              <button
                onClick={() => togglePanel('tiktok')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg transition-colors ${openPanel === 'tiktok' ? 'border-white/[0.2] text-zinc-200' : 'border-white/[0.08] hover:border-white/[0.15] text-zinc-500 hover:text-zinc-300'}`}
              >
                <TikTokIcon className="w-3 h-3" /> TikTok
              </button>
              <button
                onClick={() => togglePanel('instagram')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg transition-colors ${openPanel === 'instagram' ? 'border-white/[0.2] text-zinc-200' : 'border-white/[0.08] hover:border-white/[0.15] text-zinc-500 hover:text-zinc-300'}`}
              >
                <InstagramIcon className="w-3 h-3" /> Instagram
              </button>
            </div>
          </div>

          {/* Inline social panel */}
          {openPanel && (
            <InlineSocialPanel
              clip={clip}
              platform={openPanel}
              socialStatus={socialStatus}
              loadingSocial={loadingSocial}
              onClose={() => setOpenPanel(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface CofreClientProps {
  clips: CofreClip[]
}

export default function CofreClient({ clips }: CofreClientProps) {
  const [socialStatus, setSocialStatus] = useState<SocialStatus | null>(null)
  const [loadingSocial, setLoadingSocial] = useState(true)

  useEffect(() => {
    fetch('/api/social/status')
      .then(r => r.json())
      .then((data: SocialStatus) => setSocialStatus(data))
      .catch(() => setSocialStatus(null))
      .finally(() => setLoadingSocial(false))
  }, [])

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
          <Film className="w-7 h-7 text-zinc-700" />
        </div>
        <p className="text-zinc-400 font-semibold mb-2">Cofre ainda vazio</p>
        <p className="text-zinc-700 text-sm max-w-xs mx-auto leading-relaxed mb-6">Envie vídeos e seus clipes aparecem aqui com o potencial de views calculado.</p>
        <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-100 transition-colors">
          <Plus className="w-4 h-4" /> Pedir primeiro clipe
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">Seus ativos — {clips.length} clipes</p>
      {clips.map(clip => (
        <ClipCard
          key={clip.id}
          clip={clip}
          socialStatus={socialStatus}
          loadingSocial={loadingSocial}
        />
      ))}
    </div>
  )
}
