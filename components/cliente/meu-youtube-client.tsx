'use client'
import { useState, useRef } from 'react'
import {
  Youtube, Search, Loader2, Play, Plus,
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
  frio:   { label: 'Frio',   cssColor: '#3B82F6', bgCss: 'rgba(59,130,246,.12)',  borderCss: 'rgba(59,130,246,.3)'  },
  morno:  { label: 'Morno',  cssColor: '#8B5CF6', bgCss: 'rgba(139,92,246,.12)', borderCss: 'rgba(139,92,246,.3)' },
  quente: { label: 'Quente', cssColor: '#F97316', bgCss: 'rgba(249,115,22,.12)', borderCss: 'rgba(249,115,22,.3)' },
  viral:  { label: 'Viral',  cssColor: '#EF4444', bgCss: 'rgba(239,68,68,.15)',  borderCss: 'rgba(239,68,68,.4)'  },
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

function VideoCard({ video }: { video: YTVideo }) {
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
    <div className="bg-[#0E0E11] border border-[#1A1A1F] rounded-xl overflow-hidden hover:border-[#252530] transition-colors">
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        <div className="w-full h-full bg-[#141418] flex items-center justify-center">
          {video.thumbnail
            ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
            : <Play className="w-8 h-8 text-[#252530]" />
          }
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-[#F0F0F2] text-xs px-1.5 py-0.5 rounded font-mono">
          {fmtDur(video.durationSeconds)}
        </div>
        <a
          href={video.url} target="_blank" rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity"
        >
          <div className="w-11 h-11 rounded-full bg-[#F0F0F2] flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </a>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-[#F0F0F2] text-sm font-semibold line-clamp-2 mb-2 leading-snug">{video.title}</h3>
        <div className="flex items-center gap-3 text-xs text-[#4A4A54] mb-3">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtCount(video.viewCount)}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{fmtCount(video.likeCount)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(video.publishedAt)}</span>
        </div>

        {/* Analysis result */}
        {analysis && expanded && (
          <div className="mb-3 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                style={{ color: vCfg?.cssColor, background: vCfg?.bgCss, borderColor: vCfg?.borderCss }}
              >
                {vCfg?.label}
              </span>
              <span className="text-[#F0F0F2] font-bold text-sm">{analysis.estimatedClips} clipes estimados</span>
              {analysis.demo && <span className="text-[#252530] text-[10px]">demo</span>}
            </div>

            <p className="text-[#4A4A54] text-xs leading-relaxed">{analysis.reason}</p>

            {/* Hook */}
            <div className="bg-[#08080A] border-l-[3px] border-[#252530] rounded-r-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-[#4A4A54] font-bold mb-1.5">Hook sugerido</p>
              <p className="text-[#7A7A8A] text-xs italic leading-relaxed">"{analysis.hookSuggestion}"</p>
            </div>

            {/* Angles */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#4A4A54] font-bold mb-1.5">Ângulos identificados</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.suggestedAngles.map((a, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full border text-[#7A7A8A]"
                    style={{ background: '#141418', borderColor: '#252530' }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analyzing */}
        {analyzing && (
          <div className="mb-3 flex items-center gap-2 text-[#7A7A8A] text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analisando o vídeo...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!analysis && !analyzing && (
            <button
              onClick={analyze}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#141418] hover:bg-[#1A1A1F] border border-[#252530] hover:border-[rgba(255,255,255,.15)] text-[#7A7A8A] hover:text-[#F0F0F2] text-xs font-semibold rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Analisar com IA
            </button>
          )}

          {analysis && !ordered && (
            <button
              onClick={requestClips}
              disabled={ordering}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#F0F0F2] hover:bg-white text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              {ordering
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Plus className="w-3.5 h-3.5" />
              }
              Pedir {analysis.estimatedClips} clipes
            </button>
          )}

          {ordered && (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0E0E11] border border-[#252530] text-[#7A7A8A] text-xs font-semibold rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" /> Pedido enviado!
            </div>
          )}

          {analysis && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="px-2.5 py-2 bg-[#141418] hover:bg-[#1A1A1F] border border-[#252530] text-[#4A4A54] hover:text-[#7A7A8A] rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <a
            href={video.url} target="_blank" rel="noopener noreferrer"
            className="px-2.5 py-2 bg-[#141418] hover:bg-[#1A1A1F] border border-[#252530] text-[#4A4A54] hover:text-[#7A7A8A] rounded-lg transition-colors"
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
  const [input, setInput]     = useState(savedChannel?.handle ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [channel, setChannel] = useState<YTChannel | null>(null)
  const [videos, setVideos]   = useState<YTVideo[]>([])
  const [isDemo, setIsDemo]   = useState(false)
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

  // ── Connected ──────────────────────────────────────────────────────────────
  if (channel) {
    return (
      <div className="space-y-6 pb-12">

        {/* Channel header */}
        <div className="bg-[#08080A] border border-[#1A1A1F] rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {channel.thumbnail
                ? <img src={channel.thumbnail} alt={channel.title} className="w-11 h-11 rounded-full border border-[#252530]" />
                : (
                  <div className="w-11 h-11 rounded-full bg-[#0E0E11] border border-[#1A1A1F] flex items-center justify-center">
                    <Youtube className="w-5 h-5 text-[#4A4A54]" />
                  </div>
                )
              }
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[#F0F0F2] font-bold text-base">{channel.title}</h1>
                  {isDemo && (
                    <span className="text-[10px] text-[#4A4A54] bg-[#0E0E11] border border-[#1A1A1F] px-2 py-0.5 rounded font-semibold">demo</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#4A4A54] mt-0.5">
                  <span>{channel.handle}</span>
                  <span className="text-[#252530]">·</span>
                  <span>{fmtCount(channel.subscriberCount)} inscritos</span>
                  <span className="text-[#252530]">·</span>
                  <span>{channel.videoCount} vídeos</span>
                </div>
              </div>
            </div>

            <button
              onClick={disconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#252530] hover:border-[rgba(255,255,255,.2)] text-[#4A4A54] hover:text-[#F0F0F2] text-xs font-semibold rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Trocar canal
            </button>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 bg-[#08080A] border border-[#1A1A1F] rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-[#4A4A54] mt-0.5 shrink-0" />
          <p className="text-[#4A4A54] text-xs leading-relaxed">
            Clique em <span className="text-[#7A7A8A] font-semibold">Analisar com IA</span> em qualquer vídeo para ver quantos clipes são possíveis e o potencial viral.
            Depois clique em <span className="text-[#7A7A8A] font-semibold">Pedir clipes</span> para enviar para produção.
          </p>
        </div>

        {/* Videos grid */}
        <div>
          <p className="text-[.7rem] font-bold text-[#4A4A54] uppercase tracking-widest mb-3">
            Vídeos mais recentes — {videos.length} encontrados
          </p>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-[#4A4A54] text-sm">Nenhum vídeo encontrado</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {videos.map(v => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Connect form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#F0F0F2] mb-1 tracking-tight">Meu YouTube</h1>
        <p className="text-[#4A4A54] text-sm">
          Conecte seu canal para ver seus vídeos e usar IA para estimar os melhores clipes.
        </p>
      </div>

      {/* Connect card */}
      <div className="bg-[#08080A] border border-[#1A1A1F] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0E0E11] border border-[#1A1A1F] flex items-center justify-center">
            <Youtube className="w-4 h-4 text-[#4A4A54]" />
          </div>
          <div>
            <p className="text-[#F0F0F2] text-sm font-semibold">Conectar canal</p>
            <p className="text-[#4A4A54] text-xs">Cole o link ou handle do seu canal</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && connect()}
            placeholder="@seucanal ou youtube.com/c/seucanal"
            className="flex-1 px-3 py-2.5 bg-[#0E0E11] border border-[#252530] text-[#F0F0F2] placeholder-[#4A4A54] text-sm rounded-lg outline-none focus:border-[rgba(255,255,255,.2)] transition-colors"
          />
          <button
            onClick={connect}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F0F0F2] hover:bg-white text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Buscando...' : 'Conectar'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-xs text-[#EF4444]">{error}</p>
        )}

        <p className="mt-3 text-[10px] text-[#252530] leading-relaxed">
          Exemplos: @meucanal · youtube.com/@meucanal · youtube.com/c/meucanal · youtube.com/channel/UCxxx
        </p>
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Vídeos detectados', desc: 'Visualize todos os vídeos do seu canal em um só lugar.' },
          { label: 'Análise com IA', desc: 'Claude estima quantos clipes cada vídeo pode gerar e o potencial viral.' },
          { label: 'Pedir clipes', desc: 'Com 1 clique envie o vídeo para a fila de produção da UPFY.' },
        ].map((item, i) => (
          <div key={i} className="bg-[#08080A] border border-[#1A1A1F] rounded-xl p-4">
            <p className="text-[#7A7A8A] text-[10px] font-bold uppercase tracking-widest mb-1">{String(i+1).padStart(2,'0')}</p>
            <p className="text-[#F0F0F2] text-sm font-semibold mb-1">{item.label}</p>
            <p className="text-[#4A4A54] text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
