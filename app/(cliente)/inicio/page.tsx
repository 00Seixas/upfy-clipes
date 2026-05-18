export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Film, Plus, ArrowRight, Download, AlertTriangle, Zap } from 'lucide-react'

const CREATOR_LEVELS = [
  { min: 0,   max: 5,   name: 'Iniciante',           color: '#71717a', glow: 'rgba(113,113,122,0.25)' },
  { min: 5,   max: 15,  name: 'Consistente',          color: '#3b82f6', glow: 'rgba(59,130,246,0.25)'  },
  { min: 15,  max: 30,  name: 'Dominando',            color: '#8b5cf6', glow: 'rgba(139,92,246,0.25)'  },
  { min: 30,  max: 60,  name: 'Máquina de Conteúdo', color: '#f59e0b', glow: 'rgba(245,158,11,0.25)'  },
  { min: 60,  max: 100, name: 'Elite',                color: '#ef4444', glow: 'rgba(239,68,68,0.25)'   },
  { min: 100, max: 999, name: 'Ícone',                color: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
]

function getCreatorLevel(totalClips: number) {
  for (const l of [...CREATOR_LEVELS].reverse()) {
    if (totalClips >= l.min) {
      const range = l.max - l.min
      const progress = range < 900 ? Math.min(100, Math.round(((totalClips - l.min) / range) * 100)) : 100
      const nextLevel = CREATOR_LEVELS[CREATOR_LEVELS.indexOf(l) + 1]
      const clipsToNext = nextLevel ? nextLevel.min - totalClips : 0
      return { ...l, progress, clipsToNext }
    }
  }
  return { ...CREATOR_LEVELS[0], progress: Math.round((totalClips / 5) * 100), clipsToNext: 5 - totalClips }
}

function getConsistencyScore(orders: { created_at: string }[]) {
  if (!orders.length) return 0
  const sorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const last30 = sorted.filter(o => Date.now() - new Date(o.created_at).getTime() < 30 * 86400000).length
  const daysSinceLast = Math.floor((Date.now() - new Date(sorted[0].created_at).getTime()) / 86400000)
  let score = Math.min(100, last30 * 12)
  score = Math.max(0, score - Math.max(0, daysSinceLast - 5) * 4)
  return Math.round(score)
}

function getPsychState(orders: { created_at: string }[], score: number) {
  if (!orders.length) return 'cold' as const
  const sorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const days = Math.floor((Date.now() - new Date(sorted[0].created_at).getTime()) / 86400000)
  if (days >= 14) return 'dying' as const
  if (days >= 7)  return 'cooling' as const
  if (score >= 70) return 'firing' as const
  return 'active' as const
}

function getPlatformDominance(clips: { virality_grade: string }[], score: number) {
  const viral  = clips.filter(c => c.virality_grade === 'viral').length
  const quente = clips.filter(c => c.virality_grade === 'quente').length
  const base   = Math.min(55, clips.length * 3 + score * 0.25)
  return [
    { name: 'TikTok',         score: Math.min(96, Math.round(base + viral * 7 + quente * 2.5)) },
    { name: 'YouTube Shorts', score: Math.min(91, Math.round(base * 0.92 + quente * 4))        },
    { name: 'Instagram',      score: Math.min(88, Math.round(base * 0.84 + viral * 4))         },
    { name: 'Facebook',       score: Math.min(72, Math.round(base * 0.62))                      },
  ]
}

function getContentInsights(clips: { virality_grade: string }[]) {
  const total  = clips.length
  const viral  = clips.filter(c => c.virality_grade === 'viral').length
  const quente = clips.filter(c => c.virality_grade === 'quente').length
  const morno  = clips.filter(c => c.virality_grade === 'morno').length
  const insights: { text: string; accent: string }[] = []
  if (total === 0) return [{ text: 'Envie seu primeiro vídeo para desbloquear sua análise de conteúdo.', accent: '#71717a' }]
  const hotRate = total > 0 ? (viral + quente) / total : 0
  if (hotRate >= 0.5) insights.push({ text: `${Math.round(hotRate * 100)}% do seu conteúdo entra em zona quente. Taxa de elite.`, accent: '#ef4444' })
  if (viral > 0) insights.push({ text: 'Conteúdo viral identificado. Seu público responde a histórias e revelações.', accent: '#a78bfa' })
  if (quente > morno && quente > 0) insights.push({ text: 'Hooks agressivos performam melhor no seu perfil.', accent: '#f59e0b' })
  if (morno > quente) insights.push({ text: 'Seu público consome conteúdo educativo. Aumente a emoção nos primeiros 3s.', accent: '#3b82f6' })
  if (total >= 10) insights.push({ text: `Padrão detectado: ${total} clipes analisados. Continue para refinar a IA do seu perfil.`, accent: '#10b981' })
  if (insights.length < 2) insights.push({ text: 'Hooks rápidos nos primeiros 3 segundos aumentam sua retenção significativamente.', accent: '#8b5cf6' })
  return insights.slice(0, 3)
}

const VIRAL_VIEWS: Record<string, number> = { frio: 8000, morno: 50000, quente: 250000, viral: 800000 }
const VIRAL_CPM:   Record<string, number> = { frio: 8,    morno: 10,    quente: 12,     viral: 15     }
const VIRAL_COLOR: Record<string, string> = { frio: '#3b82f6', morno: '#f59e0b', quente: '#ef4444', viral: '#a78bfa' }

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1000)}K`
  return String(n)
}
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$ ${Math.round(n / 1000)}K`
  return `R$ ${Math.round(n)}`
}

const PSYCH = {
  firing:  { headline: 'Seu algoritmo está respondendo.', sub: 'Você está em zona de aceleração. Não pare agora.', color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
  active:  { headline: 'Sua máquina está rodando.', sub: 'Continue o ritmo. Consistência é o único diferencial.', color: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
  cooling: { headline: 'Seu algoritmo está esfriando.', sub: 'Você perdeu ritmo. Cada dia sem conteúdo custa alcance.', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  dying:   { headline: 'Seu conteúdo está morrendo.', sub: 'O algoritmo esquece quem some. Retome agora.', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  cold:    { headline: 'Tudo começa agora.', sub: 'Envie o primeiro vídeo e a máquina começa a trabalhar.', color: '#71717a', bg: 'rgba(113,113,122,0.04)' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  aguardando:         { label: 'Aguardando',   color: '#71717a', glow: 'rgba(113,113,122,0.5)' },
  em_analise:         { label: 'Em análise',   color: '#3b82f6', glow: 'rgba(59,130,246,0.6)'  },
  na_fila:            { label: 'Na fila',      color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)'  },
  atribuido:          { label: 'Atribuído',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)'  },
  em_edicao:          { label: 'Em edição',    color: '#f59e0b', glow: 'rgba(245,158,11,0.6)'  },
  revisao_interna:    { label: 'Revisão',      color: '#f97316', glow: 'rgba(249,115,22,0.6)'  },
  revisao_solicitada: { label: 'Revisão',      color: '#f97316', glow: 'rgba(249,115,22,0.6)'  },
  aprovacao:          { label: 'Aprovando',    color: '#fb923c', glow: 'rgba(251,146,60,0.6)'  },
  pronto:             { label: 'Pronto',       color: '#10b981', glow: 'rgba(16,185,129,0.6)'  },
  entregue:           { label: 'Entregue',     color: '#10b981', glow: 'rgba(16,185,129,0.6)'  },
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const [{ data: profile }, { data: contract }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', userId).single(),
    supabase.from('client_contracts').select('*').eq('user_id', userId).eq('status', 'ativo').single(),
  ])

  const { data: allOrders } = await supabase
    .from('orders').select('id, status, created_at').eq('client_id', userId).order('created_at', { ascending: false })

  const orderIds  = (allOrders ?? []).map((o: { id: string }) => o.id)
  const active    = (allOrders ?? []).filter((o: { status: string }) => !['entregue','publicado','cancelado'].includes(o.status))

  const { data: rawClips } = orderIds.length
    ? await supabase.from('deliverables').select('id, clip_number, delivered_at, virality_grade').in('order_id', orderIds).not('approved_at', 'is', null).order('delivered_at', { ascending: false })
    : { data: [] }

  const clips       = (rawClips ?? []) as { id: string; clip_number: number; delivered_at: string; virality_grade: string }[]
  const recentClips = clips.slice(0, 4)

  const consistencyScore = getConsistencyScore(allOrders ?? [])
  const psychState       = getPsychState(allOrders ?? [], consistencyScore)
  const psychMsg         = PSYCH[psychState]
  const level            = getCreatorLevel(clips.length)
  const platforms        = getPlatformDominance(clips, consistencyScore)
  const insights         = getContentInsights(clips)

  const viewsPotencial = clips.reduce((s, c) => s + (VIRAL_VIEWS[c.virality_grade] ?? 8000), 0)
  const moneyEstimate  = clips.reduce((s, c) => s + ((VIRAL_VIEWS[c.virality_grade] ?? 8000) / 1000 * (VIRAL_CPM[c.virality_grade] ?? 8)), 0)
  const viewsLost      = viewsPotencial * 2.4
  const viralClips     = clips.filter(c => ['quente','viral'].includes(c.virality_grade)).length
  const firstName      = profile?.name?.split(' ')[0] ?? 'Cliente'
  const clipsEntregues = contract?.clips_delivered ?? clips.length
  const clipsTotal     = contract?.clips_total ?? 0
  const progressPct    = clipsTotal > 0 ? Math.round((clipsEntregues / clipsTotal) * 100) : 0

  const sortedOrders  = [...(allOrders ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const daysSinceLast = sortedOrders.length ? Math.floor((Date.now() - new Date(sortedOrders[0].created_at).getTime()) / 86400000) : 999

  return (
    <div className="space-y-6 pb-16">

      {/* GREETING */}
      <div className="pt-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.18em] mb-2">Sala de Controle</p>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-3">
            Olá, {firstName}.
          </h1>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{ background: psychMsg.bg, borderColor: `${psychMsg.color}30`, color: psychMsg.color }}
          >
            {(psychState === 'dying' || psychState === 'cooling')
              ? <AlertTriangle className="w-3 h-3 shrink-0" />
              : <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: psychMsg.color }} />
            }
            {psychMsg.headline}
          </div>
        </div>

        {/* Creator Level */}
        <div
          className="shrink-0 hidden md:block bg-[#080809] border border-white/[0.06] rounded-xl px-5 py-4 min-w-[190px]"
          style={{ boxShadow: `0 0 40px ${level.glow}` }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mb-1">Nível do Criador</p>
          <p className="font-black text-sm mb-2.5" style={{ color: level.color }}>{level.name}</p>
          <div className="w-full bg-zinc-900 rounded-full h-0.5 mb-2">
            <div className="h-0.5 rounded-full transition-all" style={{ width: `${level.progress}%`, background: level.color, boxShadow: `0 0 6px ${level.glow}` }} />
          </div>
          <p className="text-zinc-700 text-[10px]">
            {level.clipsToNext > 0 ? `+${level.clipsToNext} clipes para próximo nível` : 'Nível máximo atingido'}
          </p>
        </div>
      </div>

      {/* ALERT (dying/cooling) */}
      {(psychState === 'dying' || psychState === 'cooling') && (
        <div className="flex items-start gap-4 rounded-xl border px-5 py-4" style={{ background: psychMsg.bg, borderColor: `${psychMsg.color}25` }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: psychMsg.color }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: psychMsg.color }}>{psychMsg.headline}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{psychMsg.sub}</p>
            {daysSinceLast < 999 && <p className="text-zinc-600 text-xs mt-1">Último upload há {daysSinceLast} dia{daysSinceLast !== 1 ? 's' : ''}.</p>}
          </div>
          <Link href="/enviar-videos" className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-100 transition-colors">
            Retomar <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* 4 IMPACT METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: String(clips.length), label: 'clipes trabalhando', sub: 'por você agora', accent: null as string | null },
          { value: fmtViews(viewsPotencial), label: 'views potenciais', sub: 'estimativa total', accent: viewsPotencial > 100000 ? '#a78bfa' : null as string | null },
          { value: fmtViews(Math.round(viewsLost)), label: 'views paradas', sub: 'potencial perdido', accent: '#ef4444' as string | null },
          { value: fmtMoney(moneyEstimate), label: 'valor em alcance', sub: 'estimativa CPM', accent: '#10b981' as string | null },
        ].map((m, i) => (
          <div key={i} className="bg-[#080809] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-5 transition-all duration-200"
            style={m.accent ? { boxShadow: `0 0 40px rgba(${m.accent === '#a78bfa' ? '167,139,250' : m.accent === '#ef4444' ? '239,68,68' : '16,185,129'},0.05)` } : {}}>
            <p className="text-3xl md:text-4xl font-black tracking-tight mb-1.5" style={{ color: m.accent ?? '#f4f4f5' }}>{m.value}</p>
            <p className="text-zinc-300 text-xs font-semibold">{m.label}</p>
            <p className="text-zinc-700 text-[10px] mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* SCORE + DOMINANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Consistency Score */}
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Consistency Score</p>
              <p className="text-4xl font-black text-white">{consistencyScore}<span className="text-zinc-700 text-xl font-normal">/100</span></p>
            </div>
            <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{
                borderColor: consistencyScore >= 70 ? '#10b981' : consistencyScore >= 40 ? '#f59e0b' : '#ef4444',
                boxShadow: `0 0 20px ${consistencyScore >= 70 ? 'rgba(16,185,129,0.2)' : consistencyScore >= 40 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
              <span className="text-sm font-black" style={{ color: consistencyScore >= 70 ? '#10b981' : consistencyScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                {consistencyScore >= 70 ? '↑' : consistencyScore >= 40 ? '→' : '↓'}
              </span>
            </div>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1 mb-2">
            <div className="h-1 rounded-full" style={{ width: `${consistencyScore}%`, background: consistencyScore >= 70 ? '#10b981' : consistencyScore >= 40 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <p className="text-zinc-600 text-[10px]">
            {consistencyScore >= 70 ? 'Algoritmo respondendo positivamente.' : consistencyScore >= 40 ? 'Ritmo moderado. Aumente a frequência.' : 'Score crítico. Retome o ritmo urgente.'}
          </p>
        </div>

        {/* Platform Dominance */}
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-4">Dominação de Plataformas</p>
          <div className="space-y-3">
            {platforms.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-400 text-xs font-medium">{p.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: p.score >= 70 ? '#f4f4f5' : p.score >= 50 ? '#71717a' : '#3f3f46' }}>{p.score}%</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-0.5">
                  <div className="h-0.5 rounded-full" style={{ width: `${p.score}%`, background: p.score >= 70 ? 'rgba(255,255,255,0.55)' : p.score >= 50 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-zinc-700 text-[10px] mt-3">
            {platforms[0].score >= 70 ? `Seu ${platforms[0].name} está dominando.` : `Aumente o volume para dominar o ${platforms[0].name}.`}
          </p>
        </div>
      </div>

      {/* CONTENT DNA */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-zinc-600" />
          <p className="text-zinc-300 text-sm font-semibold">IA de Perfil de Conteúdo</p>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="w-0.5 h-full min-h-[14px] rounded-full shrink-0 mt-1" style={{ background: ins.accent }} />
              <p className="text-zinc-400 text-sm leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COFRE CTA */}
      {clips.length > 0 && (
        <Link href="/cofre">
          <div className="relative overflow-hidden bg-[#080809] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-6 transition-all duration-300 group cursor-pointer">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
            <div className="relative flex items-center justify-between gap-6">
              <div>
                <p className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] mb-2">Cofre de Views</p>
                <p className="text-white text-xl font-black tracking-tight mb-1">{fmtViews(viewsPotencial)} <span className="text-zinc-600 font-normal text-base">views identificadas</span></p>
                <p className="text-zinc-600 text-xs">{viralClips} de alto impacto · {clips.length} clipes analisados</p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
            </div>
          </div>
        </Link>
      )}

      {/* PIPELINE */}
      {active.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-zinc-200 text-sm font-semibold">Produção em andamento</p>
            </div>
            <span className="text-zinc-700 text-xs">{active.length} ativo{active.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {active.slice(0, 5).map((order: { id: string; status: string; created_at: string }) => {
              const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.aguardando
              return (
                <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: s.color, boxShadow: `0 0 6px ${s.glow}` }} />
                  <span className="text-zinc-500 text-xs flex-1">Pedido · {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                </div>
              )
            })}
          </div>
          <Link href="/producao" className="flex items-center justify-center gap-2 px-5 py-3.5 text-zinc-600 hover:text-zinc-300 text-xs font-medium transition-colors border-t border-white/[0.03]">
            Ver central de missão <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* RECENT CLIPS */}
      {recentClips.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <p className="text-zinc-200 text-sm font-semibold">Últimas entregas</p>
            <Link href="/meus-clipes" className="flex items-center gap-1 text-zinc-600 hover:text-zinc-300 text-xs transition-colors">Ver todos <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {recentClips.map(clip => (
              <div key={clip.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.05] flex items-center justify-center shrink-0">
                  <Film className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm font-medium">Clipe #{clip.clip_number}</p>
                  <p className="text-zinc-700 text-xs">{new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: VIRAL_COLOR[clip.virality_grade] ?? '#71717a' }}>{clip.virality_grade?.toUpperCase()}</span>
                <a href={`/api/clips/${clip.id}/download`} className="text-zinc-700 hover:text-zinc-300 transition-colors"><Download className="w-3.5 h-3.5" /></a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link href="/enviar-videos" className="flex items-center justify-center gap-2 py-4 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.06)]">
          <Plus className="w-4 h-4" /> Pedir novo clipe
        </Link>
        <Link href="/meus-clipes" className="flex items-center justify-center gap-2 py-4 bg-transparent border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-zinc-200 font-medium text-sm rounded-xl transition-all">
          <Film className="w-4 h-4" /> Minha biblioteca
        </Link>
      </div>

      {clips.length === 0 && active.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <Film className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold mb-2">Tudo começa com o primeiro clipe</p>
          <p className="text-zinc-700 text-sm max-w-xs mx-auto leading-relaxed mb-6">Envie um vídeo e a máquina começa a trabalhar por você.</p>
          <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-100 transition-colors">
            <Plus className="w-4 h-4" /> Ativar a máquina
          </Link>
        </div>
      )}
    </div>
  )
}
