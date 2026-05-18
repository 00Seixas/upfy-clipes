export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, TrendingUp, Zap, Target, Award } from 'lucide-react'

const VIRAL_SYSTEM = {
  frio:   { label: 'FRIO',   color: '#1d4ed8', textColor: '#3b82f6', potencial: 25000,   cpm: 8,  segments: 3  },
  morno:  { label: 'MORNO',  color: '#d97706', textColor: '#f59e0b', potencial: 150000,  cpm: 10, segments: 6  },
  quente: { label: 'QUENTE', color: '#dc2626', textColor: '#ef4444', potencial: 600000,  cpm: 13, segments: 8  },
  viral:  { label: 'VIRAL',  color: '',        textColor: '#a78bfa', potencial: 2000000, cpm: 15, segments: 10 },
} as const

type VGrade = keyof typeof VIRAL_SYSTEM

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}K`
  return String(n)
}

function fmtMoney(n: number) {
  if (n >= 1000) return `R$${(n / 1000).toFixed(0)}K`
  return `R$${Math.round(n)}`
}

function getMonthlyData(clips: { virality_grade: string; delivered_at: string }[]) {
  const months: Record<string, { month: string; clips: number; views: number }> = {}
  clips.forEach(c => {
    const d = new Date(c.delivered_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    if (!months[key]) months[key] = { month: label, clips: 0, views: 0 }
    months[key].clips++
    months[key].views += VIRAL_SYSTEM[c.virality_grade as VGrade]?.potencial ?? 25000
  })
  return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v)
}

function getProfileInsights(clips: { virality_grade: string }[]): string[] {
  const total = clips.length
  if (total === 0) return ['Envie seus primeiros vídeos para gerar seu perfil de conteúdo.']
  
  const dist = Object.fromEntries(Object.keys(VIRAL_SYSTEM).map(k => [k, clips.filter(c => c.virality_grade === k).length]))
  const viralRate = ((dist.viral + dist.quente) / total * 100)
  const insights: string[] = []

  if (viralRate >= 50) {
    insights.push(`${Math.round(viralRate)}% dos seus clipes atingem alto potencial viral — você está no top 5% dos criadores.`)
  } else if (viralRate >= 25) {
    insights.push(`1 em cada 4 clipes seus atinge alto impacto. Aumentar frequência pode escalar esse número exponencialmente.`)
  } else {
    insights.push(`Seus clipes estão em fase de calibração. O algoritmo aprende a cada entrega — consistência é o ativo mais valioso agora.`)
  }

  if (dist.viral > 0) {
    insights.push(`Você já tem ${dist.viral} clipe${dist.viral > 1 ? 's' : ''} com potencial viral real. Esses formatos são seu DNA de crescimento — explore variações.`)
  } else if (dist.quente > 0) {
    insights.push(`Seus clipes QUENTE mostram que você tem conteúdo de impacto. O próximo passo é escalar para o nível viral.`)
  }

  if (total >= 10) {
    const recentClips = clips.slice(0, 5)
    const recentHot = recentClips.filter(c => ['quente', 'viral'].includes(c.virality_grade)).length
    if (recentHot >= 3) {
      insights.push(`Sua tendência recente é ascendente — ${recentHot}/5 últimos clipes com alto impacto. Momentum ativo.`)
    } else {
      insights.push(`Diversificar formatos e hooks nos próximos pedidos pode elevar seu índice de viralidade em até 40%.`)
    }
  }

  return insights.slice(0, 3)
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const { data: clientOrders } = await supabase.from('orders').select('id, created_at').eq('client_id', userId)
  const orderIds = (clientOrders ?? []).map((o: { id: string }) => o.id)

  const { data: clips } = orderIds.length
    ? await supabase.from('deliverables').select('id, virality_grade, delivered_at').in('order_id', orderIds).not('approved_at', 'is', null).order('delivered_at', { ascending: false })
    : { data: [] }

  const allClips = clips ?? []
  const total = allClips.length

  const dist = Object.fromEntries(Object.keys(VIRAL_SYSTEM).map(k => [k, allClips.filter((c: { virality_grade: string }) => c.virality_grade === k).length])) as Record<VGrade, number>

  const viewsPotencial = allClips.reduce((sum: number, c: { virality_grade: string }) => sum + (VIRAL_SYSTEM[c.virality_grade as VGrade]?.potencial ?? 25000), 0)
  const moneyEst = allClips.reduce((sum: number, c: { virality_grade: string }) => {
    const cfg = VIRAL_SYSTEM[c.virality_grade as VGrade]
    if (!cfg) return sum + (25000 / 1000 * 8)
    return sum + (cfg.potencial / 1000 * cfg.cpm)
  }, 0)

  const altaOportunidade = (dist.quente ?? 0) + (dist.viral ?? 0)
  const viralRate = total > 0 ? Math.round(altaOportunidade / total * 100) : 0

  const monthlyData = getMonthlyData(allClips)
  const maxViews = Math.max(...monthlyData.map(m => m.views), 1)
  const insights = getProfileInsights(allClips)

  return (
    <div className="space-y-8 pb-16">

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-[#080809] border border-white/[0.06]">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(59,130,246,0.12) 0%, transparent 60%)' }} />
        <div className="relative px-8 py-10">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-6 flex items-center gap-3">
            <span className="inline-block w-5 h-px bg-zinc-800" />
            Perfil de Conteúdo
          </p>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2">Central de Impacto</h1>
              <p className="text-zinc-500 text-sm">Inteligência do seu conteúdo em tempo real</p>
            </div>
            <Link href="/enviar-videos" className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Novo Clipe
            </Link>
          </div>
        </div>
      </div>

      {/* IMPACT METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Clipes', value: String(total), sub: 'entregues e aprovados', icon: Award, hex: '' },
          { label: 'Views Estimadas', value: fmtViews(viewsPotencial), sub: 'potencial acumulado', icon: TrendingUp, hex: '' },
          { label: 'Alto Potencial', value: String(altaOportunidade), sub: `${viralRate}% do total`, icon: Zap, hex: '#ef4444' },
          { label: 'Receita Estimada', value: fmtMoney(moneyEst), sub: 'via monetização', icon: Target, hex: '' },
        ].map(({ label, value, sub, icon: Icon, hex }) => (
          <div key={label} className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">{label}</p>
              <Icon className="w-3.5 h-3.5 text-zinc-800" />
            </div>
            <p className="text-2xl font-black tracking-tight text-white" style={hex ? { color: hex } : {}}>
              {value}
            </p>
            <p className="text-zinc-700 text-[10px] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* MONTHLY EVOLUTION */}
      {monthlyData.length > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-6">Evolução Mensal — Views Potenciais</p>
          <div className="flex items-end gap-3 h-32">
            {monthlyData.map((m, i) => {
              const pct = m.views / maxViews
              const isLast = i === monthlyData.length - 1
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${Math.max(pct * 100, 4)}px`,
                        background: isLast ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                        border: isLast ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                      }}
                    />
                  </div>
                  <span className="text-zinc-700 text-[9px] font-medium">{m.month}</span>
                </div>
              )
            })}
          </div>
          {monthlyData.length === 0 && (
            <p className="text-zinc-700 text-sm text-center py-8">Dados aparecerão após as primeiras entregas</p>
          )}
        </div>
      )}

      {/* VIRALITY DISTRIBUTION */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-6">Distribuição de Viralidade</p>
        {total === 0 ? (
          <p className="text-zinc-700 text-sm text-center py-8">Nenhum clipe entregue ainda</p>
        ) : (
          <div className="space-y-4">
            {(Object.entries(VIRAL_SYSTEM) as [VGrade, typeof VIRAL_SYSTEM[VGrade]][]).reverse().map(([key, cfg]) => {
              const count = dist[key] ?? 0
              const pct = total > 0 ? count / total : 0
              const isGradient = key === 'viral'
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-[9px] font-black tracking-[0.12em] w-14 text-right shrink-0" style={{ color: cfg.textColor }}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct * 100}%`,
                        background: isGradient ? 'linear-gradient(to right, #7c3aed, #ec4899)' : cfg.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-20 justify-end">
                    <span className="text-zinc-400 text-xs font-bold">{count}</span>
                    <span className="text-zinc-700 text-[10px]">{Math.round(pct * 100)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI PROFILE INSIGHTS */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">IA de Perfil</p>
          <span className="text-[8px] font-bold text-zinc-800 border border-zinc-800 px-1.5 py-0.5 rounded tracking-wider">ANÁLISE INTELIGENTE</span>
        </div>
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[8px] font-black text-zinc-600">{i + 1}</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* VIRALITY BREAKDOWN TABLE */}
      {total > 0 && (
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.04]">
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">Breakdown por Nível</p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {(Object.entries(VIRAL_SYSTEM) as [VGrade, typeof VIRAL_SYSTEM[VGrade]][]).map(([key, cfg]) => {
              const count = dist[key] ?? 0
              const viewsTotal = count * cfg.potencial
              const moneyTotal = count * (cfg.potencial / 1000 * cfg.cpm)
              return (
                <div key={key} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black tracking-[0.12em] w-12" style={{ color: cfg.textColor }}>{cfg.label}</span>
                    <span className="text-zinc-600 text-xs">{count} clipes</span>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-zinc-300 text-xs font-semibold">{fmtViews(viewsTotal)}</p>
                      <p className="text-zinc-700 text-[9px]">views potenciais</p>
                    </div>
                    <div>
                      <p className="text-zinc-300 text-xs font-semibold">{fmtMoney(moneyTotal)}</p>
                      <p className="text-zinc-700 text-[9px]">receita est.</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
