export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Film, Plus, Archive, TrendingUp, Flame,
  CheckCircle, Clock, Zap, ArrowRight, Download,
  Star, BarChart2, Target,
} from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  aguardando:          { label: 'Aguardando',    color: 'text-zinc-400',    dot: 'bg-zinc-600'    },
  em_analise:          { label: 'Em análise',    color: 'text-blue-400',    dot: 'bg-blue-500'    },
  na_fila:             { label: 'Na fila',       color: 'text-violet-400',  dot: 'bg-violet-500'  },
  atribuido:           { label: 'Atribuído',     color: 'text-violet-400',  dot: 'bg-violet-500'  },
  em_edicao:           { label: 'Em edição ✏️',  color: 'text-amber-400',   dot: 'bg-amber-400'   },
  revisao_interna:     { label: 'Revisão',       color: 'text-orange-400',  dot: 'bg-orange-400'  },
  revisao_solicitada:  { label: 'Revisão',       color: 'text-orange-400',  dot: 'bg-orange-400'  },
  aprovacao:           { label: 'Aprovando 👀',  color: 'text-orange-300',  dot: 'bg-orange-300'  },
  pronto:              { label: 'Pronto ✓',      color: 'text-emerald-400', dot: 'bg-emerald-400' },
  entregue:            { label: 'Entregue',      color: 'text-emerald-400', dot: 'bg-emerald-400' },
}

const VIRALITY: Record<string, { label: string; color: string; bg: string }> = {
  frio:   { label: '❄️ Frio',   color: 'text-zinc-400',   bg: 'bg-zinc-800/60'   },
  morno:  { label: '🌤 Morno',  color: 'text-amber-400',  bg: 'bg-amber-950/40'  },
  quente: { label: '🔥 Quente', color: 'text-orange-400', bg: 'bg-orange-950/40' },
  viral:  { label: '🚀 Viral',  color: 'text-green-400',  bg: 'bg-green-950/40'  },
}

const MOTIVATIONAL = [
  'Seu conteúdo está vivo. A máquina está rodando.',
  'Cada clipe entregue é mais presença digital.',
  'Consistência é o único caminho. Você está no caminho certo.',
  'Sua concorrência dorme. Você produz.',
  'Todo clipe é uma oportunidade de crescimento.',
]

function getStreak(orders: { created_at: string }[]): number {
  if (!orders.length) return 0
  const weekSet = new Set(
    orders.map(o => {
      const d = new Date(o.created_at)
      const jan1 = new Date(d.getFullYear(), 0, 1)
      return `${d.getFullYear()}-${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`
    })
  )
  return weekSet.size
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
    .from('orders')
    .select('id, status, created_at')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })

  const orderIds   = (allOrders ?? []).map((o: { id: string }) => o.id)
  const active     = (allOrders ?? []).filter((o: { status: string }) =>
    !['entregue','publicado','cancelado'].includes(o.status))
  const inEditing  = active.filter((o: { status: string }) => ['em_edicao','revisao_interna','aprovacao','revisao_solicitada'].includes(o.status))

  const { data: allDeliverables } = orderIds.length
    ? await supabase
        .from('deliverables')
        .select('id, clip_number, delivered_at, virality_grade, feedback, filename')
        .in('order_id', orderIds)
        .not('approved_at', 'is', null)
        .order('delivered_at', { ascending: false })
    : { data: [] }

  const clips        = allDeliverables ?? []
  const recentClips  = clips.slice(0, 3)
  const viralClips   = clips.filter((c: { virality_grade: string }) => ['quente','viral'].includes(c.virality_grade)).length

  const clipsTotal      = contract?.clips_total ?? 0
  const clipsEntregues  = contract?.clips_delivered ?? 0
  const clipsRestantes  = Math.max(0, clipsTotal - clipsEntregues)
  const progressPct     = clipsTotal > 0 ? Math.round((clipsEntregues / clipsTotal) * 100) : 0

  const streak    = getStreak(allOrders ?? [])
  const firstName = profile?.name?.split(' ')[0] ?? 'Cliente'
  const motivMsg  = MOTIVATIONAL[Math.floor(Date.now() / 86400000) % MOTIVATIONAL.length]

  // Views potenciais estimadas por virality grade
  const viewsPotencial = clips.reduce((sum: number, c: { virality_grade: string }) => {
    const map: Record<string, number> = { frio: 8000, morno: 50000, quente: 250000, viral: 800000 }
    return sum + (map[c.virality_grade] ?? 8000)
  }, 0)

  function fmtViews(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `${Math.round(n / 1000)}K`
    return String(n)
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ── HERO ── */}
      <div className="relative bg-gradient-to-br from-violet-950/40 via-zinc-900/20 to-transparent border border-violet-800/20 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(124,58,237,0.12),_transparent_60%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Bem-vindo de volta</p>
              <h1 className="text-3xl font-bold text-white">{firstName}</h1>
              <p className="text-zinc-400 text-sm mt-2 max-w-md leading-relaxed">{motivMsg}</p>
            </div>
            {streak > 0 && (
              <div className="shrink-0 flex flex-col items-center bg-orange-950/40 border border-orange-800/30 rounded-xl px-4 py-3">
                <Flame className="w-5 h-5 text-orange-400 mb-1" />
                <p className="text-white font-bold text-xl leading-none">{streak}</p>
                <p className="text-orange-400/70 text-[10px] mt-0.5">semanas</p>
              </div>
            )}
          </div>

          {/* Contrato progress */}
          {contract && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>{clipsEntregues} clipes entregues</span>
                <span>{progressPct}% do contrato</span>
              </div>
              <div className="w-full bg-zinc-800/60 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-violet-600 to-violet-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-600 mt-1.5">
                <span>{clipsRestantes} restantes</span>
                {contract.end_date && (
                  <span>até {new Date(contract.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MÉTRICAS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Film,      color: 'text-violet-400', bg: 'bg-violet-950/30 border-violet-800/20', value: clipsEntregues, label: 'Entregues' },
          { icon: Clock,     color: 'text-amber-400',  bg: 'bg-amber-950/30 border-amber-800/20',   value: inEditing.length, label: 'Em edição' },
          { icon: TrendingUp,color: 'text-emerald-400',bg: 'bg-emerald-950/30 border-emerald-800/20',value: fmtViews(viewsPotencial), label: 'Views potenciais' },
          { icon: Star,      color: 'text-orange-400', bg: 'bg-orange-950/30 border-orange-800/20', value: viralClips, label: 'Clipes quentes' },
        ].map((m, i) => (
          <div key={i} className={`border rounded-xl p-4 ${m.bg}`}>
            <m.icon className={`w-4 h-4 mb-2 ${m.color}`} />
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* ── VIEWS POTENCIAIS CTA ── */}
      {clips.length > 0 && (
        <Link href="/cofre" className="block relative bg-gradient-to-r from-violet-950/60 to-zinc-900/40 border border-violet-700/30 rounded-2xl p-5 hover:border-violet-600/40 transition-colors overflow-hidden group">
          <div className="absolute right-4 top-4 text-violet-800/30 text-7xl font-black select-none group-hover:text-violet-700/30 transition-colors">✦</div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-4 h-4 text-violet-400" />
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-wider">Cofre de Views</span>
            </div>
            <p className="text-white font-bold text-xl mb-1">
              {fmtViews(viewsPotencial)} views potenciais paradas
            </p>
            <p className="text-zinc-400 text-sm">
              {clips.length} clipes com oportunidades identificadas. Explore agora.
            </p>
            <span className="inline-flex items-center gap-1 mt-3 text-violet-400 text-xs font-medium">
              Ver oportunidades <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      )}

      {/* ── PEDIDOS EM ANDAMENTO ── */}
      {active.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <p className="text-white text-sm font-semibold">Máquina rodando</p>
            </div>
            <span className="text-xs bg-violet-900/30 text-violet-400 border border-violet-800/30 px-2 py-0.5 rounded-full">
              {active.length} ativo{active.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {active.slice(0, 5).map((order: { id: string; status: string; created_at: string }) => {
              const s = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-zinc-400', dot: 'bg-zinc-600' }
              return (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot} animate-pulse`} />
                  <span className="text-zinc-400 text-xs flex-1">
                    Pedido de {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
          <Link href="/producao" className="flex items-center justify-center gap-1.5 px-5 py-3 text-zinc-500 hover:text-zinc-300 text-xs transition-colors border-t border-zinc-800/40">
            Ver pipeline completo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ── ÚLTIMOS CLIPES ── */}
      {recentClips.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-400" />
              <p className="text-white text-sm font-semibold">Últimas entregas</p>
            </div>
            <Link href="/meus-clipes" className="text-violet-400 text-xs hover:text-violet-300 transition-colors flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {recentClips.map((clip: { id: string; clip_number: number; delivered_at: string; virality_grade: string }) => {
              const v = VIRALITY[clip.virality_grade] ?? VIRALITY.frio
              return (
                <div key={clip.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0">
                    <Film className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm font-medium">Clipe #{clip.clip_number}</p>
                    <p className="text-zinc-600 text-xs">
                      {new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${v.bg} ${v.color}`}>{v.label}</span>
                  <a href={`/api/clips/${clip.id}/download`} className="text-zinc-600 hover:text-white transition-colors ml-1">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CTAs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/enviar-videos"
          className="flex items-center justify-center gap-2 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Pedir novo clipe
        </Link>
        <Link
          href="/meus-clipes"
          className="flex items-center justify-center gap-2 py-4 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 font-medium text-sm rounded-xl transition-colors border border-zinc-700/40"
        >
          <Film className="w-4 h-4" />
          Minha biblioteca
        </Link>
      </div>

    </div>
  )
}
