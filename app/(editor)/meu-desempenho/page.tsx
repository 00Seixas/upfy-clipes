export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const VIRALITY_VIEWS: Record<string, number> = {
  frio:   25_000,
  morno:  150_000,
  quente: 600_000,
  viral:  2_000_000,
}

const VIRALITY_CONFIG = {
  frio:   { label: 'Frio',   color: 'text-blue-400',   bar: 'bg-blue-500'   },
  morno:  { label: 'Morno',  color: 'text-purple-400', bar: 'bg-purple-500' },
  quente: { label: 'Quente', color: 'text-orange-400', bar: 'bg-orange-500' },
  viral:  { label: 'Viral',  color: 'text-red-400',    bar: 'bg-red-500'    },
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}

export default async function MeuDesempenhoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('id, virality_grade, delivered_at, client_rating')
    .eq('editor_id', userId)
    .order('delivered_at', { ascending: false })

  const all = deliverables ?? []
  const total = all.length

  // Distribution by grade
  const dist: Record<string, number> = { frio: 0, morno: 0, quente: 0, viral: 0 }
  for (const d of all) {
    const g = d.virality_grade as string
    if (g in dist) dist[g]++
  }

  // Viral rate
  const viralCount = dist.quente + dist.viral
  const viralRate = total > 0 ? Math.round((viralCount / total) * 100) : 0

  // Views potential sum
  let totalViews = 0
  for (const d of all) {
    const g = d.virality_grade as string
    totalViews += VIRALITY_VIEWS[g] ?? 0
  }

  // Average rating
  const ratings = all.filter(d => d.client_rating != null).map(d => d.client_rating as number)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  // Clips this month vs last month
  const now = new Date()
  const startThisMonth  = new Date(now.getFullYear(), now.getMonth(), 1)
  const startLastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonth = all.filter(d => new Date(d.delivered_at) >= startThisMonth).length
  const lastMonth = all.filter(d => {
    const dt = new Date(d.delivered_at)
    return dt >= startLastMonth && dt < startThisMonth
  }).length

  const growth = lastMonth > 0
    ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
    : null

  // Best month
  const monthCounts: Record<string, number> = {}
  for (const d of all) {
    const dt = new Date(d.delivered_at)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    monthCounts[key] = (monthCounts[key] ?? 0) + 1
  }
  let bestMonthKey = ''
  let bestMonthCount = 0
  for (const [k, v] of Object.entries(monthCounts)) {
    if (v > bestMonthCount) { bestMonthKey = k; bestMonthCount = v }
  }
  let bestMonthLabel = ''
  if (bestMonthKey) {
    const [y, m] = bestMonthKey.split('-')
    const d = new Date(Number(y), Number(m) - 1, 1)
    bestMonthLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  // Motivational message
  let motivation = ''
  let motivationColor = ''
  if (viralRate >= 40) {
    motivation = 'Você está no top tier de editores. Continue assim.'
    motivationColor = 'text-green-400'
  } else if (viralRate >= 20) {
    motivation = 'Bom ritmo. Foque em hooks mais fortes nos primeiros 3s.'
    motivationColor = 'text-amber-400'
  } else {
    motivation = 'Calibre seu olho para viralidade. Estude os clipes de alto impacto.'
    motivationColor = 'text-red-400'
  }

  // Viral rate color for hero
  const viralRateColor = viralRate >= 40 ? 'text-green-400' : viralRate >= 20 ? 'text-amber-400' : 'text-red-400'
  const viralRateBg    = viralRate >= 40 ? 'bg-green-500/10 border-green-500/20' : viralRate >= 20 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'

  const distributionOrder = ['viral', 'quente', 'morno', 'frio'] as const

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Meu Desempenho</h1>
        <p className="text-zinc-400 text-sm">Métricas dos seus clipes entregues na plataforma.</p>
      </div>

      {total === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-sm">Nenhum clipe entregue ainda. Suas métricas aparecerão aqui.</p>
        </div>
      ) : (
        <>
          {/* Hero — Taxa Viral */}
          <div className={`rounded-2xl border p-8 text-center ${viralRateBg}`}>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-2">Taxa Viral</p>
            <p className={`text-7xl font-black tracking-tight mb-1 ${viralRateColor}`}>{viralRate}%</p>
            <p className="text-zinc-400 text-sm mb-4">
              {viralCount} de {total} clipes com potencial quente ou viral
            </p>
            <p className={`text-sm font-medium ${motivationColor}`}>{motivation}</p>
          </div>

          {/* 4 metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mb-1">Total Entregues</p>
              <p className="text-white text-3xl font-black">{total}</p>
              <p className="text-zinc-600 text-xs mt-1">clipes</p>
            </div>

            <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mb-1">Views Geradas</p>
              <p className="text-white text-3xl font-black">{fmt(totalViews)}</p>
              <p className="text-zinc-600 text-xs mt-1">potencial total</p>
            </div>

            <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mb-1">Nota Média</p>
              {avgRating !== null ? (
                <>
                  <p className="text-white text-3xl font-black">{avgRating}</p>
                  <p className="text-zinc-600 text-xs mt-1">de {ratings.length} avaliações</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-600 text-3xl font-black">—</p>
                  <p className="text-zinc-600 text-xs mt-1">sem avaliações</p>
                </>
              )}
            </div>

            <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mb-1">Clipes este Mês</p>
              <p className="text-white text-3xl font-black">{thisMonth}</p>
              {growth !== null ? (
                <p className={`text-xs mt-1 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {growth >= 0 ? '+' : ''}{growth}% vs mês anterior
                </p>
              ) : (
                <p className="text-zinc-600 text-xs mt-1">primeiro mês</p>
              )}
            </div>
          </div>

          {/* Virality distribution */}
          <div className="bg-[#111113] border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-5">Distribuição por Grau</p>
            <div className="space-y-3">
              {distributionOrder.map(grade => {
                const cfg = VIRALITY_CONFIG[grade]
                const count = dist[grade]
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <span className={`w-14 text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <div className="flex-1 bg-zinc-800/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cfg.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-zinc-500 text-xs w-8 text-right">{count}</span>
                    <span className="text-zinc-700 text-xs w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Best month */}
          {bestMonthLabel && (
            <div className="bg-[#111113] border border-zinc-800 rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-1">Seu Melhor Mês</p>
                <p className="text-white text-lg font-bold capitalize">{bestMonthLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-white text-4xl font-black">{bestMonthCount}</p>
                <p className="text-zinc-600 text-xs">clipes</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
