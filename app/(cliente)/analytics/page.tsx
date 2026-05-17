export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BarChart2, TrendingUp, Film, Zap, Star } from 'lucide-react'

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1000)}K`
  return String(n)
}

const VIRALITY_VIEWS: Record<string, number> = { frio: 8000, morno: 50000, quente: 250000, viral: 800000 }

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const { data: clientOrders } = await supabase.from('orders').select('id, created_at').eq('client_id', userId)
  const orderIds = (clientOrders ?? []).map((o: { id: string }) => o.id)

  const { data: clips } = orderIds.length
    ? await supabase.from('deliverables')
        .select('id, clip_number, virality_grade, delivered_at')
        .in('order_id', orderIds)
        .not('approved_at', 'is', null)
        .order('delivered_at', { ascending: true })
    : { data: [] }

  const allClips = clips ?? []

  // Group by month for chart
  const byMonth: Record<string, { clips: number; views: number }> = {}
  allClips.forEach((c: { delivered_at: string; virality_grade: string }) => {
    const month = new Date(c.delivered_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    if (!byMonth[month]) byMonth[month] = { clips: 0, views: 0 }
    byMonth[month].clips++
    byMonth[month].views += VIRALITY_VIEWS[c.virality_grade] ?? 8000
  })

  const months = Object.entries(byMonth).slice(-6) // last 6 months
  const maxClips = Math.max(1, ...months.map(([, v]) => v.clips))

  const totalViews = allClips.reduce((s: number, c: { virality_grade: string }) => s + (VIRALITY_VIEWS[c.virality_grade] ?? 8000), 0)
  const viralCount = allClips.filter((c: { virality_grade: string }) => ['quente', 'viral'].includes(c.virality_grade)).length
  const avgPerMonth = months.length > 0 ? (allClips.length / months.length).toFixed(1) : '0'

  const dist = { frio: 0, morno: 0, quente: 0, viral: 0 }
  allClips.forEach((c: { virality_grade: string }) => { if (c.virality_grade in dist) (dist as Record<string,number>)[c.virality_grade]++ })

  const insights: string[] = []
  if (viralCount > 0)                    insights.push(`${viralCount} clipe${viralCount > 1 ? 's' : ''} com alto potencial de viralização.`)
  if (parseFloat(avgPerMonth) >= 4)      insights.push(`Média de ${avgPerMonth} clipes/mês. Constância é seu diferencial.`)
  if (dist.viral > 0 || dist.quente > 0) insights.push('Conteúdo quente e viral gera retenção acima da média.')
  if (allClips.length >= 10)             insights.push('Com mais de 10 clipes, seu histórico começa a mostrar padrões.')
  if (insights.length === 0)             insights.push('Continue enviando vídeos para desbloquear insights personalizados.')

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Performance e métricas do seu conteúdo.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Film,      value: allClips.length,         label: 'Total de clipes',   color: 'text-violet-400' },
          { icon: TrendingUp,value: fmtViews(totalViews),    label: 'Views estimadas',   color: 'text-emerald-400' },
          { icon: Star,      value: viralCount,              label: 'Alto potencial',    color: 'text-orange-400' },
          { icon: Zap,       value: `${avgPerMonth}/mês`,    label: 'Média mensal',      color: 'text-amber-400' },
        ].map((m, i) => (
          <div key={i} className="bg-[#111113] border border-zinc-800/60 rounded-xl p-4">
            <m.icon className={`w-4 h-4 mb-2 ${m.color}`} />
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart — clips by month */}
      {months.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-4">Clipes entregues por mês</p>
          <div className="flex items-end gap-2 h-32">
            {months.map(([month, data]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                <p className="text-zinc-400 text-xs font-medium">{data.clips}</p>
                <div
                  className="w-full bg-violet-600/80 rounded-t-md transition-all hover:bg-violet-500/80"
                  style={{ height: `${Math.max(8, (data.clips / maxClips) * 96)}px` }}
                />
                <p className="text-zinc-600 text-[10px] capitalize truncate w-full text-center">{month}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virality distribution */}
      {allClips.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-4">Distribuição de viralidade</p>
          <div className="space-y-3">
            {[
              { key: 'viral',   label: '🚀 Viral',   color: 'bg-green-500' },
              { key: 'quente',  label: '🔥 Quente',  color: 'bg-orange-500' },
              { key: 'morno',   label: '🌤 Morno',   color: 'bg-amber-500' },
              { key: 'frio',    label: '❄️ Frio',    color: 'bg-zinc-600' },
            ].map(({ key, label, color }) => {
              const count = (dist as Record<string,number>)[key] ?? 0
              const pct   = allClips.length > 0 ? Math.round((count / allClips.length) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300">{label}</span>
                    <span className="text-zinc-500">{count} clipes · {pct}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-violet-400" />
          <p className="text-white text-sm font-semibold">Insights</p>
        </div>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-violet-500 mt-0.5 shrink-0">→</span>
              <p className="text-zinc-300 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
