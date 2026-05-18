export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Film, Plus } from 'lucide-react'

const VIRALITY_CONFIG = {
  frio:   { label: 'Frio',   cssColor: '#3B82F6', bgCss: 'rgba(59,130,246,.12)',  borderCss: 'rgba(59,130,246,.3)',  potencial: 25000,   views: 8000   },
  morno:  { label: 'Morno',  cssColor: '#8B5CF6', bgCss: 'rgba(139,92,246,.12)', borderCss: 'rgba(139,92,246,.3)', potencial: 150000,  views: 50000  },
  quente: { label: 'Quente', cssColor: '#F97316', bgCss: 'rgba(249,115,22,.12)', borderCss: 'rgba(249,115,22,.3)', potencial: 600000,  views: 250000 },
  viral:  { label: 'Viral',  cssColor: '#EF4444', bgCss: 'rgba(239,68,68,.15)',  borderCss: 'rgba(239,68,68,.4)',  potencial: 2000000, views: 800000 },
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

      {/* Vault CTA */}
      <div className="relative bg-[#08080A] border border-[#252530] rounded-xl p-7 overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-[220px] h-[220px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.025) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-[.68rem] font-bold uppercase tracking-[.12em] text-[#7A7A8A] mb-4 flex items-center gap-2">
            <span className="inline-block w-4 h-px bg-[#4A4A54]" />
            Cofre de Views
          </p>
          <h1 className="text-4xl font-black text-[#F0F0F2] mb-2 tracking-tight leading-none">
            {fmtViews(totalPotencial)}
          </h1>
          <p className="text-[#7A7A8A] text-sm mb-1">views potenciais identificadas</p>
          <p className="text-[#4A4A54] text-xs mb-6">
            {allClips.length} clipes analisados · {oportunidades} oportunidades de alto impacto
          </p>

          {/* Metrics row */}
          <div className="flex gap-0 mb-6 border border-[#1A1A1F] rounded-lg overflow-hidden w-fit">
            {(Object.entries(VIRALITY_CONFIG) as [VGrade, typeof VIRALITY_CONFIG[VGrade]][]).map(([key, cfg]) => (
              <div key={key} className="px-5 py-3 border-r border-[#1A1A1F] last:border-r-0 text-center">
                <span className="block text-lg font-black mb-0.5" style={{ color: cfg.cssColor }}>
                  {dist[key] ?? 0}
                </span>
                <span className="text-[.65rem] text-[#4A4A54] font-semibold uppercase tracking-[.06em]">{cfg.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/enviar-videos"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F0F0F2] hover:bg-white text-black font-semibold rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Pedir novo clipe
            </Link>
            <Link
              href="/meu-youtube"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-transparent border border-[#252530] hover:border-[rgba(255,255,255,.2)] text-[#7A7A8A] hover:text-[#F0F0F2] font-semibold rounded-lg transition-colors text-sm"
            >
              Ver Meu YouTube
            </Link>
          </div>
        </div>
      </div>

      {/* Clips list */}
      {allClips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0E0E11] border border-[#1A1A1F] flex items-center justify-center mx-auto mb-4">
            <Film className="w-5 h-5 text-[#4A4A54]" />
          </div>
          <p className="text-[#7A7A8A] font-semibold text-sm">Cofre ainda vazio</p>
          <p className="text-[#4A4A54] text-xs mt-1 mb-6 max-w-xs leading-relaxed">
            Envie vídeos e seus clipes aparecem aqui com o potencial de views calculado.
          </p>
          <Link
            href="/enviar-videos"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0F0F2] hover:bg-white text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Pedir primeiro clipe
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[.7rem] font-bold text-[#4A4A54] uppercase tracking-widest">Seus clipes — potencial de views</p>

          {allClips.map((clip: { id: string; clip_number: number; virality_grade: string; feedback: string; delivered_at: string; filename: string }) => {
            const cfg = VIRALITY_CONFIG[clip.virality_grade as VGrade] ?? VIRALITY_CONFIG.frio
            const barWidth = clip.virality_grade === 'viral' ? '90%' : clip.virality_grade === 'quente' ? '70%' : clip.virality_grade === 'morno' ? '45%' : '20%'

            return (
              <div key={clip.id} className="bg-[#08080A] border border-[#1A1A1F] rounded-xl p-5 hover:border-[#252530] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-[#0E0E11] border border-[#1A1A1F] flex items-center justify-center shrink-0 mt-0.5">
                    <Film className="w-4 h-4 text-[#4A4A54]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#F0F0F2] text-sm font-semibold">Clipe #{clip.clip_number}</span>
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                        style={{ color: cfg.cssColor, background: cfg.bgCss, borderColor: cfg.borderCss }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {clip.feedback && (
                      <p className="text-[#4A4A54] text-xs leading-relaxed line-clamp-2">{clip.feedback}</p>
                    )}
                    <p className="text-[#252530] text-xs mt-1">
                      {new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Potential */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black" style={{ color: cfg.cssColor }}>{fmtViews(cfg.potencial)}</p>
                    <p className="text-[#4A4A54] text-xs">views potenciais</p>
                  </div>
                </div>

                {/* Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[#4A4A54] mb-1.5">
                    <span>Estimativa de alcance</span>
                    <span>{fmtViews(cfg.views)} – {fmtViews(cfg.potencial)}</span>
                  </div>
                  <div className="w-full bg-[#0E0E11] rounded-full h-1">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: barWidth, background: cfg.cssColor, opacity: 0.6 }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={`/api/clips/${clip.id}/download`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F0F2] hover:bg-white text-black text-xs font-semibold rounded-lg transition-colors"
                  >
                    Baixar clipe
                  </a>
                  <Link
                    href="/enviar-videos"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#252530] hover:border-[rgba(255,255,255,.2)] text-[#7A7A8A] hover:text-[#F0F0F2] text-xs font-semibold rounded-lg transition-colors"
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
