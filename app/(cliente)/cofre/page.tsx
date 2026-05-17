export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Archive, TrendingUp, Zap, Plus, ArrowRight, Film } from 'lucide-react'

const VIRALITY_CONFIG = {
  frio:   { label: '❄️ Frio',   color: 'text-zinc-400',   bg: 'bg-zinc-800/60 border-zinc-700/40',   views: 8000,   potencial: 25000  },
  morno:  { label: '🌤 Morno',  color: 'text-amber-400',  bg: 'bg-amber-950/40 border-amber-800/30', views: 50000,  potencial: 150000 },
  quente: { label: '🔥 Quente', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-700/30',views: 250000, potencial: 600000 },
  viral:  { label: '🚀 Viral',  color: 'text-green-400',  bg: 'bg-green-950/40 border-green-700/30', views: 800000, potencial: 2000000},
} as const

type VGrade = keyof typeof VIRALITY_CONFIG

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1000)}K`
  return String(n)
}

export default async function CofrePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const { data: clientOrders } = await supabase.from('orders').select('id').eq('client_id', userId)
  const orderIds = (clientOrders ?? []).map((o: { id: string }) => o.id)

  const { data: clips } = orderIds.length
    ? await supabase.from('deliverables')
        .select('id, clip_number, virality_grade, feedback, delivered_at, filename')
        .in('order_id', orderIds)
        .not('approved_at', 'is', null)
        .order('delivered_at', { ascending: false })
    : { data: [] }

  const allClips = clips ?? []

  const totalPotencial = allClips.reduce((sum: number, c: { virality_grade: string }) => {
    const cfg = VIRALITY_CONFIG[c.virality_grade as VGrade] ?? VIRALITY_CONFIG.frio
    return sum + cfg.potencial
  }, 0)

  const oportunidades = allClips.filter((c: { virality_grade: string }) =>
    ['quente', 'viral'].includes(c.virality_grade)
  ).length

  const dist = Object.fromEntries(
    Object.keys(VIRALITY_CONFIG).map(k => [
      k, allClips.filter((c: { virality_grade: string }) => c.virality_grade === k).length
    ])
  )

  return (
    <div className="space-y-6 pb-12">

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-violet-950/50 via-zinc-900/30 to-zinc-950 border border-violet-700/30 rounded-2xl p-7 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(124,58,237,0.2),_transparent_60%)]" />
        <div className="absolute right-8 top-8 text-violet-800/20 text-[120px] font-black select-none leading-none">✦</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-xs font-semibold uppercase tracking-widest">Cofre de Views</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            {fmtViews(totalPotencial)}
          </h1>
          <p className="text-zinc-300 text-lg font-medium mb-1">views potenciais identificadas</p>
          <p className="text-zinc-500 text-sm mb-6">
            {allClips.length} clipes analisados · {oportunidades} oportunidades de alto impacto
          </p>
          <Link
            href="/enviar-videos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors text-sm"
          >
            <Zap className="w-4 h-4" /> Pedir novo clipe
          </Link>
        </div>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(VIRALITY_CONFIG) as [VGrade, typeof VIRALITY_CONFIG[VGrade]][]).map(([key, cfg]) => (
          <div key={key} className={`border rounded-xl p-4 text-center ${cfg.bg}`}>
            <p className={`text-2xl font-bold ${cfg.color}`}>{dist[key] ?? 0}</p>
            <p className="text-xs text-zinc-500 mt-1">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Clips list */}
      {allClips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-950/30 border border-violet-800/30 flex items-center justify-center mx-auto mb-4">
            <Archive className="w-6 h-6 text-violet-600" />
          </div>
          <p className="text-zinc-400 font-medium">Cofre ainda vazio</p>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Envie vídeos e seus clipes aparecem aqui com o potencial de views calculado.</p>
          <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Pedir primeiro clipe
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">Seus clipes — potencial de views</p>
          {allClips.map((clip: { id: string; clip_number: number; virality_grade: string; feedback: string; delivered_at: string; filename: string }) => {
            const cfg = VIRALITY_CONFIG[clip.virality_grade as VGrade] ?? VIRALITY_CONFIG.frio
            return (
              <div key={clip.id} className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Film className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-semibold">Clipe #{clip.clip_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {clip.feedback && (
                        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{clip.feedback}</p>
                      )}
                      <p className="text-zinc-700 text-xs mt-1">
                        {new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${cfg.color}`}>{fmtViews(cfg.potencial)}</p>
                    <p className="text-zinc-600 text-xs">views potenciais</p>
                  </div>
                </div>

                {/* Potential bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
                    <span>Estimativa de alcance</span>
                    <span>{fmtViews(cfg.views)} – {fmtViews(cfg.potencial)}</span>
                  </div>
                  <div className="w-full bg-zinc-800/60 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${clip.virality_grade === 'viral' ? 'bg-green-500' : clip.virality_grade === 'quente' ? 'bg-orange-500' : clip.virality_grade === 'morno' ? 'bg-amber-500' : 'bg-zinc-600'}`}
                      style={{ width: clip.virality_grade === 'viral' ? '90%' : clip.virality_grade === 'quente' ? '70%' : clip.virality_grade === 'morno' ? '45%' : '20%' }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={`/api/clips/${clip.id}/download`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
                  >
                    Baixar clipe
                  </a>
                  <Link
                    href="/enviar-videos"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-900/40 hover:bg-violet-800/40 border border-violet-700/30 text-violet-300 text-xs rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Criar similar
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
