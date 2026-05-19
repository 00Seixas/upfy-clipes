export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

const VIRAL_SYSTEM = {
  frio:   { label: 'Frio',   className: 'text-[#3b82f6] border border-blue-500/20 bg-blue-500/[0.06]',   views: 25_000    },
  morno:  { label: 'Morno',  className: 'text-[#f59e0b] border border-amber-500/20 bg-amber-500/[0.06]', views: 150_000   },
  quente: { label: 'Quente', className: 'text-[#ef4444] border border-red-500/20 bg-red-500/[0.06]',     views: 600_000   },
  viral:  { label: 'Viral',  className: 'text-[#a78bfa] border border-purple-500/20 bg-purple-500/[0.06]', views: 2_000_000 },
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < Math.round(rating) ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

export default async function EntreguesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select(`
      id, clip_number, virality_grade, feedback, delivered_at, approved_at,
      client_approved_at, client_rating, revision_notes,
      orders!inner(client_id, profiles!orders_client_id_fkey(name))
    `)
    .eq('editor_id', userId)
    .order('delivered_at', { ascending: false })

  const all = deliverables ?? []
  const total = all.length

  // Stats
  const viralCount = all.filter(d =>
    d.virality_grade === 'quente' || d.virality_grade === 'viral'
  ).length
  const viralRate = total > 0 ? Math.round((viralCount / total) * 100) : 0

  const ratings = all
    .filter(d => d.client_rating != null)
    .map(d => d.client_rating as number)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  let totalViews = 0
  for (const d of all) {
    const g = d.virality_grade as keyof typeof VIRAL_SYSTEM
    totalViews += VIRAL_SYSTEM[g]?.views ?? 0
  }

  const viralRateColor =
    viralRate >= 40 ? 'text-green-400' :
    viralRate >= 20 ? 'text-amber-400' :
    'text-red-400'

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Entregues</h1>
        <p className="text-zinc-400 text-sm">Histórico dos seus clipes finalizados.</p>
      </div>

      {total === 0 ? (
        <div className="text-center py-24">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-5 h-5 text-zinc-700" />
          </div>
          <p className="text-zinc-400 text-sm font-medium">Nenhum clipe entregue ainda.</p>
          <p className="text-zinc-700 text-xs mt-1">Seus clipes finalizados aparecerão aqui.</p>
        </div>
      ) : (
        <>
          {/* Hero stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-4">
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">Total Entregues</p>
              <p className="text-white text-3xl font-black">{total}</p>
              <p className="text-zinc-700 text-xs mt-1">clipes</p>
            </div>

            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-4">
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">Taxa Viral</p>
              <p className={`text-3xl font-black ${viralRateColor}`}>{viralRate}%</p>
              <p className="text-zinc-700 text-xs mt-1">{viralCount} quente + viral</p>
            </div>

            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-4">
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">Nota Média</p>
              {avgRating !== null ? (
                <>
                  <p className="text-amber-400 text-3xl font-black">{avgRating} ★</p>
                  <p className="text-zinc-700 text-xs mt-1">de {ratings.length} avaliações</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-700 text-3xl font-black">—</p>
                  <p className="text-zinc-700 text-xs mt-1">sem avaliações</p>
                </>
              )}
            </div>

            <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-4">
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">Views Geradas</p>
              <p className="text-white text-3xl font-black">{fmtViews(totalViews)}</p>
              <p className="text-zinc-700 text-xs mt-1">potencial total</p>
            </div>
          </div>

          {/* Clip list */}
          <div className="space-y-2">
            {all.map(d => {
              const grade = d.virality_grade as keyof typeof VIRAL_SYSTEM
              const viralCfg = VIRAL_SYSTEM[grade]
              const order = d.orders as unknown as { profiles: { name: string } }

              let statusLabel: string
              let statusClass: string
              if (d.client_approved_at) {
                statusLabel = 'Aprovado pelo cliente'
                statusClass = 'text-green-400 border border-green-500/20 bg-green-500/[0.06]'
              } else if (d.approved_at) {
                statusLabel = 'Aguardando cliente'
                statusClass = 'text-zinc-400 border border-white/[0.06] bg-white/[0.02]'
              } else {
                statusLabel = 'Pendente admin'
                statusClass = 'text-zinc-600 border border-white/[0.04] bg-white/[0.01]'
              }

              return (
                <div
                  key={d.id}
                  className="bg-[#080809] border border-white/[0.06] rounded-xl p-5 flex items-center gap-4"
                >
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white text-sm font-semibold">
                        Clipe {d.clip_number}
                      </span>
                      {viralCfg && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${viralCfg.className}`}>
                          {viralCfg.label}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}`}>
                        {statusLabel}
                      </span>
                      {d.revision_notes && (
                        <span className="text-[10px] font-bold text-amber-500/70 border border-amber-500/20 bg-amber-500/[0.04] px-2 py-0.5 rounded-full">
                          Revisado
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-600 text-xs">
                      {order?.profiles?.name} •{' '}
                      {new Date(d.delivered_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Right — rating */}
                  <div className="shrink-0 text-right">
                    {d.client_rating != null ? (
                      <Stars rating={d.client_rating as number} />
                    ) : (
                      <span className="text-zinc-700 text-sm">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
