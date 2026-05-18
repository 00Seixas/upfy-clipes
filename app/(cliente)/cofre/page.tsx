export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Film, Plus, ArrowRight } from 'lucide-react'

const VIRAL_SYSTEM = {
  frio:   { label: 'FRIO',   segments: 3,  color: '#1d4ed8', gradient: false, glow: null,                     textColor: '#3b82f6', potencial: 25000,   views: 8000   },
  morno:  { label: 'MORNO',  segments: 6,  color: '#d97706', gradient: false, glow: 'rgba(217,119,6,0.35)',    textColor: '#f59e0b', potencial: 150000,  views: 50000  },
  quente: { label: 'QUENTE', segments: 8,  color: '#dc2626', gradient: false, glow: 'rgba(220,38,38,0.5)',     textColor: '#ef4444', potencial: 600000,  views: 250000 },
  viral:  { label: 'VIRAL',  segments: 10, color: '',        gradient: true,  glow: 'rgba(124,58,237,0.6)',    textColor: '#a78bfa', potencial: 2000000, views: 800000 },
} as const

type VGrade = keyof typeof VIRAL_SYSTEM

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}K`
  return String(n)
}

function EnergyBar({ grade, size = 'md' }: { grade: VGrade; size?: 'sm' | 'md' }) {
  const cfg = VIRAL_SYSTEM[grade]
  const total = 10
  const barH = size === 'sm' ? 10 : 14

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[3px] items-end">
        {Array.from({ length: total }).map((_, i) => {
          const active = i < cfg.segments
          const h = size === 'sm' ? barH : barH + i * 1
          return (
            <div
              key={i}
              className={`w-[5px] rounded-sm ${cfg.glow && active && grade === 'quente' ? 'animate-quente-pulse' : ''} ${cfg.glow && active && grade === 'viral' ? 'animate-viral-pulse' : ''}`}
              style={{
                height: `${h}px`,
                background: active
                  ? cfg.gradient ? 'linear-gradient(to top, #7c3aed, #ec4899)' : cfg.color
                  : 'rgba(255,255,255,0.04)',
                boxShadow: active && cfg.glow ? `0 0 6px ${cfg.glow}` : 'none',
              }}
            />
          )
        })}
      </div>
      <span className="text-[10px] font-black tracking-[0.15em]" style={{ color: cfg.textColor }}>
        {cfg.label}
      </span>
    </div>
  )
}

export default async function CofrePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const { data: clientOrders } = await supabase.from('orders').select('id').eq('client_id', userId)
  const orderIds = (clientOrders ?? []).map((o: { id: string }) => o.id)

  const { data: clips } = orderIds.length
    ? await supabase.from('deliverables').select('id, clip_number, virality_grade, feedback, delivered_at').in('order_id', orderIds).not('approved_at', 'is', null).order('delivered_at', { ascending: false })
    : { data: [] }

  const allClips = clips ?? []
  const totalPotencial = allClips.reduce((sum: number, c: { virality_grade: string }) => {
    return sum + (VIRAL_SYSTEM[c.virality_grade as VGrade]?.potencial ?? 25000)
  }, 0)
  const oportunidades = allClips.filter((c: { virality_grade: string }) => ['quente','viral'].includes(c.virality_grade)).length
  const dist = Object.fromEntries(Object.keys(VIRAL_SYSTEM).map(k => [k, allClips.filter((c: { virality_grade: string }) => c.virality_grade === k).length]))

  return (
    <div className="space-y-8 pb-16">

      {/* CINEMATIC HERO */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-[#080809]" />
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(124,58,237,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(59,130,246,0.1) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
        <div className="relative px-8 py-12">
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <span className="inline-block w-6 h-px bg-zinc-800" />
            Scanner de Oportunidades Virais
          </p>
          <div className="flex items-end justify-between gap-8 mb-8">
            <div>
              <div className="text-6xl md:text-8xl font-black tracking-tight leading-none text-white mb-3" style={{ textShadow: '0 0 80px rgba(255,255,255,0.08)' }}>
                {fmtViews(totalPotencial)}
              </div>
              <p className="text-zinc-400 text-lg font-medium">views identificadas nos seus clipes</p>
              <p className="text-zinc-700 text-sm mt-1.5">{allClips.length} clipes analisados · {oportunidades} de alto impacto</p>
            </div>
            <div className="hidden md:flex flex-col gap-3 shrink-0">
              {(Object.entries(VIRAL_SYSTEM) as [VGrade, typeof VIRAL_SYSTEM[VGrade]][]).map(([key]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-zinc-700 text-xs w-5 text-right font-mono">{dist[key] ?? 0}</span>
                  <EnergyBar grade={key} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <Plus className="w-4 h-4" /> CLIPE AGORA
            </Link>
            <Link href="/meu-youtube" className="inline-flex items-center gap-2 px-5 py-3 border border-white/[0.1] hover:border-white/[0.2] text-zinc-400 hover:text-zinc-200 text-sm font-medium rounded-xl transition-all">
              Meu YouTube <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE ENERGY BARS */}
      <div className="md:hidden bg-[#080809] border border-white/[0.06] rounded-xl p-5">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-4">Energia viral</p>
        <div className="grid grid-cols-2 gap-4">
          {(Object.entries(VIRAL_SYSTEM) as [VGrade, typeof VIRAL_SYSTEM[VGrade]][]).map(([key]) => (
            <div key={key} className="flex flex-col gap-2">
              <span className="text-zinc-400 text-sm font-bold">{dist[key] ?? 0} clipes</span>
              <EnergyBar grade={key} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* CLIPS */}
      {allClips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <Film className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold mb-2">Cofre ainda vazio</p>
          <p className="text-zinc-700 text-sm max-w-xs mx-auto leading-relaxed mb-6">Envie vídeos e seus clipes aparecem aqui com o potencial de views calculado.</p>
          <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-100 transition-colors">
            <Plus className="w-4 h-4" /> Pedir primeiro clipe
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">Seus ativos — {allClips.length} clipes</p>
          {allClips.map((clip: { id: string; clip_number: number; virality_grade: string; feedback: string; delivered_at: string }) => {
            const grade = (clip.virality_grade in VIRAL_SYSTEM ? clip.virality_grade : 'frio') as VGrade
            const cfg = VIRAL_SYSTEM[grade]
            return (
              <div key={clip.id} className="bg-[#080809] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-5 transition-all duration-200"
                style={cfg.glow ? { boxShadow: `0 0 40px rgba(${grade === 'viral' ? '124,58,237' : grade === 'quente' ? '220,38,38' : grade === 'morno' ? '217,119,6' : '29,78,216'},0.04)` } : {}}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.05] flex items-center justify-center shrink-0">
                    <Film className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className="text-zinc-200 text-sm font-semibold">Clipe #{clip.clip_number}</span>
                      <span className="text-zinc-700 text-xs">{new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="mb-3"><EnergyBar grade={grade} /></div>
                    {clip.feedback && <p className="text-zinc-600 text-xs leading-relaxed line-clamp-2 mb-3">{clip.feedback}</p>}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-black tracking-tight" style={{ color: cfg.textColor }}>{fmtViews(cfg.potencial)}</span>
                        <span className="text-zinc-700 text-xs ml-1.5">views potenciais</span>
                      </div>
                      <div className="flex gap-2">
                        <a href={`/api/clips/${clip.id}/download`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-black text-xs font-semibold rounded-lg transition-colors">Baixar</a>
                        <Link href="/enviar-videos" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] hover:border-white/[0.15] text-zinc-500 hover:text-zinc-300 text-xs font-semibold rounded-lg transition-colors">
                          <Plus className="w-3 h-3" /> Similar
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
