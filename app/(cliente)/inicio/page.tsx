export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Film, Plus, ArrowRight, Download } from 'lucide-react'

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

const VIRAL_COLOR: Record<string, string> = {
  frio:   '#3b82f6',
  morno:  '#f59e0b',
  quente: '#ef4444',
  viral:  '#a78bfa',
}

const MOTIVATIONAL = [
  'Sua máquina está rodando.',
  'Cada clipe é mais presença digital.',
  'Consistência ganha o jogo longo.',
  'Sua concorrência dorme. Você produz.',
  'Todo clipe é uma oportunidade.',
]

function getStreak(orders: { created_at: string }[]): number {
  if (!orders.length) return 0
  const weekSet = new Set(orders.map(o => {
    const d = new Date(o.created_at)
    const jan1 = new Date(d.getFullYear(), 0, 1)
    return `${d.getFullYear()}-${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`
  }))
  return weekSet.size
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}K`
  return String(n)
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
  const inEditing = active.filter((o: { status: string }) => ['em_edicao','revisao_interna','aprovacao','revisao_solicitada'].includes(o.status))

  const { data: allDeliverables } = orderIds.length
    ? await supabase.from('deliverables').select('id, clip_number, delivered_at, virality_grade, filename').in('order_id', orderIds).not('approved_at', 'is', null).order('delivered_at', { ascending: false })
    : { data: [] }

  const clips = allDeliverables ?? []
  const recentClips = clips.slice(0, 4)
  const viralClips = clips.filter((c: { virality_grade: string }) => ['quente','viral'].includes(c.virality_grade)).length
  const clipsEntregues = contract?.clips_delivered ?? clips.length
  const clipsTotal = contract?.clips_total ?? 0
  const progressPct = clipsTotal > 0 ? Math.round((clipsEntregues / clipsTotal) * 100) : 0
  const streak = getStreak(allOrders ?? [])
  const firstName = profile?.name?.split(' ')[0] ?? 'Cliente'
  const motivMsg = MOTIVATIONAL[Math.floor(Date.now() / 86400000) % MOTIVATIONAL.length]
  const viewsPotencial = clips.reduce((sum: number, c: { virality_grade: string }) => {
    return sum + ({ frio: 8000, morno: 50000, quente: 250000, viral: 800000 }[c.virality_grade] ?? 8000)
  }, 0)

  return (
    <div className="space-y-8 pb-16">

      {/* GREETING */}
      <div className="pt-2 flex items-start justify-between gap-6">
        <div>
          <p className="text-zinc-600 text-xs tracking-[0.15em] uppercase mb-2">{motivMsg}</p>
          <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-1">Olá, {firstName}.</h1>
          {streak > 0 && (
            <p className="text-zinc-600 text-sm mt-3">
              <span className="text-orange-400 font-semibold">{streak} semanas</span> consecutivas produzindo
            </p>
          )}
        </div>
        {contract && clipsTotal > 0 && (
          <div className="shrink-0 hidden md:block bg-[#080809] border border-white/[0.06] rounded-xl px-5 py-4 min-w-[170px]">
            <p className="text-zinc-700 text-[10px] uppercase tracking-widest mb-2">Contrato</p>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-white text-2xl font-black">{clipsEntregues}</span>
              <span className="text-zinc-700 text-sm">/ {clipsTotal}</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-px">
              <div className="h-px rounded-full bg-white/50 transition-all" style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
            <p className="text-zinc-700 text-[10px] mt-2">{progressPct}% concluído</p>
          </div>
        )}
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: clipsEntregues, label: 'Clipes entregues', sub: 'total produzido', accent: null as string | null },
          { value: inEditing.length, label: 'Em produção', sub: 'agora mesmo', accent: inEditing.length > 0 ? '#3b82f6' : null as string | null },
          { value: fmtViews(viewsPotencial), label: 'Views potenciais', sub: 'estimativa total', accent: viewsPotencial > 100000 ? '#8b5cf6' : null as string | null },
          { value: viralClips, label: 'Clipes quentes', sub: 'alta viralidade', accent: viralClips > 0 ? '#dc2626' : null as string | null },
        ].map((m, i) => (
          <div
            key={i}
            className="bg-[#080809] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-all duration-200"
            style={m.accent ? { boxShadow: `inset 0 0 0 1px transparent, 0 0 40px rgba(${m.accent === '#3b82f6' ? '59,130,246' : m.accent === '#8b5cf6' ? '139,92,246' : '220,38,38'},0.06)` } : {}}
          >
            <p className="text-4xl font-black tracking-tight mb-1.5" style={{ color: m.accent ?? '#f4f4f5' }}>{m.value}</p>
            <p className="text-zinc-300 text-sm font-medium">{m.label}</p>
            <p className="text-zinc-700 text-xs mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* COFRE CTA */}
      {clips.length > 0 && (
        <Link href="/cofre">
          <div className="relative overflow-hidden bg-[#080809] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-6 transition-all duration-300 group cursor-pointer">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
            <div className="relative flex items-center justify-between gap-6">
              <div>
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mb-2">Cofre de Views</p>
                <p className="text-white text-2xl font-black tracking-tight mb-1">
                  {fmtViews(viewsPotencial)} <span className="text-zinc-500 font-normal text-xl">views esperando</span>
                </p>
                <p className="text-zinc-600 text-sm">{clips.length} clipes · {viralClips} de alto impacto</p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors text-sm font-medium">
                Explorar <ArrowRight className="w-4 h-4" />
              </div>
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
                  <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
                </div>
              )
            })}
          </div>
          <Link href="/producao" className="flex items-center justify-center gap-2 px-5 py-3.5 text-zinc-600 hover:text-zinc-300 text-xs font-medium transition-colors border-t border-white/[0.03]">
            Ver pipeline completo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ÚLTIMAS ENTREGAS */}
      {recentClips.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <p className="text-zinc-200 text-sm font-semibold">Últimas entregas</p>
            <Link href="/meus-clipes" className="flex items-center gap-1 text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {recentClips.map((clip: { id: string; clip_number: number; delivered_at: string; virality_grade: string }) => (
              <div key={clip.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.05] flex items-center justify-center shrink-0">
                  <Film className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm font-medium">Clipe #{clip.clip_number}</p>
                  <p className="text-zinc-700 text-xs">{new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: VIRAL_COLOR[clip.virality_grade] ?? '#71717a' }}>
                  {clip.virality_grade?.toUpperCase() ?? 'FRIO'}
                </span>
                <a href={`/api/clips/${clip.id}/download`} className="text-zinc-700 hover:text-zinc-300 transition-colors" onClick={e => e.stopPropagation()}>
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link href="/enviar-videos" className="flex items-center justify-center gap-2 py-4 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.06)]">
          <Plus className="w-4 h-4" /> Pedir novo clipe
        </Link>
        <Link href="/meus-clipes" className="flex items-center justify-center gap-2 py-4 bg-transparent border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-zinc-200 font-medium text-sm rounded-xl transition-all duration-200">
          <Film className="w-4 h-4" /> Minha biblioteca
        </Link>
      </div>

      {clips.length === 0 && active.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <Film className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold mb-2">Tudo começa com o primeiro clipe</p>
          <p className="text-zinc-700 text-sm max-w-xs mx-auto leading-relaxed mb-6">Envie um vídeo e nossa equipe entrega os melhores momentos prontos para postar.</p>
          <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-100 transition-colors">
            <Plus className="w-4 h-4" /> Pedir primeiro clipe
          </Link>
        </div>
      )}
    </div>
  )
}
