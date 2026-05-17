'use client'
import { useState, useRef } from 'react'
import {
  Youtube, Search, Loader2, Play, Download, Plus, Zap,
  Eye, ThumbsUp, Clock, ChevronDown, ChevronUp,
  Sparkles, X, CheckCircle, ExternalLink,
} from 'lucide-react'

type YTVideo = {
  id: string; title: string; description: string; thumbnail: string
  publishedAt: string; durationSeconds: number; viewCount: number
  likeCount: number; url: string
}

type YTChannel = {
  id: string; title: string; handle: string; thumbnail: string
  subscriberCount: number; videoCount: number
}

type ClipAnalysis = {
  estimatedClips: number
  viralPotential: 'frio' | 'morno' | 'quente' | 'viral'
  reason: string
  suggestedAngles: string[]
  bestMomentTypes: string[]
  hookSuggestion: string
  demo?: boolean
}

const VIRAL_CONFIG = {
  frio:   { label: '❄️ Frio',   color: 'text-zinc-400',   bg: 'bg-zinc-800/60 border-zinc-700/40'   },
  morno:  { label: '🌤 Morno',  color: 'text-amber-400',  bg: 'bg-amber-950/40 border-amber-800/30' },
  quente: { label: '🔥 Quente', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-700/30'},
  viral:  { label: '🚀 Viral',  color: 'text-green-400',  bg: 'bg-green-950/40 border-green-700/30' },
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n/1000)}K`
  return String(n)
}
function fmtDur(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 30)  return `${d}d atrás`
  const mo = Math.floor(d/30)
  return `${mo} ${mo===1?'mês':'meses'} atrás`
}

function VideoCard({ video, onRequestClips }: { video: YTVideo; onRequestClips: (v: YTVideo) => void }) {
  const [analysis, setAnalysis]   = useState<ClipAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [ordering, setOrdering]   = useState(false)
  const [ordered, setOrdered]     = useState(false)

  async function analyze() {
    setAnalyzing(true)
    setExpanded(true)
    try {
      const res = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:           video.title,
          description:     video.description,
          durationSeconds: video.durationSeconds,
          viewCount:       video.viewCount,
          likeCount:       video.likeCount,
        }),
      })
      setAnalysis(await res.json())
    } finally {
      setAnalyzing(false)
    }
  }

  async function requestClips() {
    setOrdering(true)
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: [{
            filename:    `${video.title}.youtube`,
            r2Key:       `youtube/${video.id}`,
            contentType: 'video/youtube',
            size:        0,
            briefing: {
              tone:         'educativo',
              cta:          'nenhum',
              music:        '',
              editingStyle: 'dinâmico',
              notes:        `YouTube: ${video.url}\nClipes estimados: ${analysis?.estimatedClips ?? '?'}`,
              youtubeUrl:   video.url,
              youtubeId:    video.id,
              youtubeTitle: video.title,
            },
          }],
        }),
      })
      setOrdered(true)
    } finally {
      setOrdering(false)
    }
  }

  const vCfg = analysis ? VIRAL_CONFIG[analysis.viralPotential] : null

  return (
    <div className="bg-[#111113] border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-colors">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-900">
        {video.thumbnail
          ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-zinc-700" /></div>
        }
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
          {fmtDur(video.durationSeconds)}
        </div>
        <a
          href={video.url} target="_blank" rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </a>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white text-sm font-semibold line-clamp-2 mb-2">{video.title}</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtCount(video.viewCount)}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{fmtCount(video.likeCount)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(video.publishedAt)}</span>
        </div>

        {/* Analysis result */}
        {analysis && expanded && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${vCfg?.bg} ${vCfg?.color}`}>
                  {vCfg?.label}
                </span>
                <span className="text-white font-bold text-sm">{analysis.estimatedClips} clipes</span>
              </div>
              {analysis.demo && <span className="text-zinc-700 text-[10px]">demo</span>}
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">{analysis.reason}</p>

            <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-lg p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">Hook sugerido</p>
              <p className="text-zinc-300 text-xs italic">"{analysis.hookSuggestion}"</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Ângulos identificados</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.suggestedAngles.map((a, i) => (
                  <span key={i} className="text-xs bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/40">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analyzing state */}
        {analyzing && (
          <div className="mb-3 flex items-center gap-2 text-violet-400 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Claude analisando o vídeo...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!analysis && !analyzing && (
            <button
              onClick={analyze}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-900/40 hover:bg-violet-800/40 border border-violet-700/30 text-violet-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Analisar com IA
            </button>
          )}

          {analysis && !ordered && (
            <button
              onClick={requestClips}
              disabled={ordering}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {ordering
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Zap className="w-3.5 h-3.5" />
              }
              Pedir {analysis.estimatedClips} clipes
            </button>
          )}

          {ordered && (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-950/40 border border-emerald-700/30 text-emerald-400 text-xs font-medium rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" /> Pedido enviado!
            </div>
          )}

          {analysis && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="px-2.5 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <a
            href={video.url} target="_blank" rel="noopener noreferrer"
            className="px-2.5 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function MeuYouTubeClient({
  savedChannel,
}: {
  savedChannel: { id: string; handle: string; title: string } | null
}) {
  const [input, setInput]       = useState(savedChannel?.handle ?? '')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [channel, setChannel]   = useState<YTChannel | null>(null)
  const [videos, setVideos]     = useState<YTVideo[]>([])
  const [isDemo, setIsDemo]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function connect() {
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/youtube/channel?input=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao buscar canal')
      setChannel(data.channel)
      setVideos(data.videos)
      setIsDemo(!!data.demo)

      // Save to profile (silently)
      if (!data.demo) {
        fetch('/api/youtube/channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId:     data.channel.id,
            channelHandle: data.channel.handle,
            channelTitle:  data.channel.title,
          }),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setChannel(null)
    setVideos([])
    setInput('')
    setError(null)
  }

  // Connected view
  if (channel) {
    return (
      <div className="space-y-6 pb-12">
        {/* Channel header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {channel.thumbnail
              ? <img src={channel.thumbnail} alt={channel.title} className="w-10 h-10 rounded-full border border-zinc-700" />
              : <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-800/30 flex items-center justify-center"><Youtube className="w-5 h-5 text-red-500" /></div>
            }
            <div>
              <h1 className="text-white font-bold text-lg">{channel.title}</h1>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>{channel.handle}</span>
                <span>{fmtCount(channel.subscriberCount)} inscritos</span>
                <span>{channel.videoCount} vídeos</span>
                {isDemo && <span className="text-violet-500 bg-violet-950/40 px-2 py-0.5 rounded-full border border-violet-800/30">modo demo</span>}
              </div>
            </div>
          </div>
          <button
            onClick={disconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 text-xs rounded-lg transition-colors border border-zinc-700/40"
          >
            <X className="w-3.5 h-3.5" /> Trocar canal
          </button>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 bg-violet-950/20 border border-violet-800/20 rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-zinc-400 text-xs leading-relaxed">
            Clique em <span className="text-violet-300 font-medium">Analisar com IA</span> em qualquer vídeo para ver quantos clipes são possíveis e o potencial viral. Depois clique em <span className="text-violet-300 font-medium">Pedir clipes</span> para enviar para produção.
          </p>
        </div>

        {/* Videos grid */}
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-3">
            Vídeos mais recentes
          </p>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">Nenhum vídeo encontrado</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {videos.map(v => (
                <VideoCard key={v.id} video={v} onRequestClips={() => {}} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Connect view
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-white">Meu YouTube</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Conecte seu canal, analise seus vídeos com IA e peça clipes diretamente.
        </p>
      </div>

      {/* Connect form */}
      <div className="bg-[#111113] border border-zinc-800/60 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-800/30 flex items-center justify-center">
            <Youtube className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-white font-semibold">Conectar canal</p>
            <p className="text-zinc-500 text-xs">Cole o link ou @handle do seu canal</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && connect()}
            placeholder="@seucanal ou youtube.com/channel/..."
            className="flex-1 bg-zinc-900/60 border border-zinc-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
          <button
            onClick={connect}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Buscando...' : 'Conectar'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-red-400 text-xs bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Youtube,   color: 'text-red-400',    bg: 'bg-red-950/30 border-red-800/20',    step: '01', title: 'Conecte seu canal',     desc: 'Cole o link ou @handle do seu YouTube' },
          { icon: Sparkles,  color: 'text-violet-400', bg: 'bg-violet-950/30 border-violet-800/20',step:'02', title: 'IA analisa seus vídeos', desc: 'Claude estima quantos clipes e o potencial viral' },
          { icon: Zap,       color: 'text-amber-400',  bg: 'bg-amber-950/30 border-amber-800/20', step: '03', title: 'Peça os clipes',          desc: 'Um clique e vai pra fila de produção' },
        ].map(({ icon: Icon, color, bg, step, title, desc }) => (
          <div key={step} className={`border rounded-xl p-5 ${bg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-zinc-700 text-xs font-mono">{step}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-white text-sm font-semibold mb-1">{title}</p>
            <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* No API key notice */}
      {!process.env.NEXT_PUBLIC_YOUTUBE_CONFIGURED && (
        <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl px-4 py-3">
          <p className="text-amber-400 text-xs font-semibold mb-1">⚙️ Configuração necessária</p>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Adicione <code className="text-zinc-300 bg-zinc-800 px-1 rounded">YOUTUBE_API_KEY</code> e{' '}
            <code className="text-zinc-300 bg-zinc-800 px-1 rounded">ANTHROPIC_API_KEY</code> no{' '}
            <code className="text-zinc-300 bg-zinc-800 px-1 rounded">.env.local</code> para ativar.
            Enquanto isso, funciona em modo demo.
          </p>
        </div>
      )}
    </div>
  )
}
