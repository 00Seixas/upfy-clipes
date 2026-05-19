'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, AlertTriangle, ChevronDown, ChevronUp,
  Music, Megaphone, Palette, FileText, Film,
} from 'lucide-react'

interface OrderInQueue {
  id: string
  status: string
  briefing: Record<string, string>
  created_at: string
  deadline?: string
  profiles: { name: string; whatsapp: string } | null
}

const TONE_LABELS: Record<string, string> = {
  'engraçado':   'Engraçado',
  educativo:     'Educativo',
  inspiracional: 'Inspiracional',
  'polêmico':    'Polêmico',
}

const CTA_LABELS: Record<string, string> = {
  segue_la:   'Segue lá',
  link_na_bio: 'Link na bio',
  nenhum:     'Nenhum',
}

function isUrgent(deadline?: string): boolean {
  if (!deadline) return false
  const diff = new Date(deadline).getTime() - Date.now()
  return diff < 24 * 60 * 60 * 1000 && diff > 0
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `há ${days}d`
  if (hours > 0) return `há ${hours}h`
  const mins = Math.floor(diff / 60000)
  if (mins > 0) return `há ${mins}min`
  return 'agora'
}

function oldestAge(orders: OrderInQueue[]): string {
  if (!orders.length) return '—'
  const oldest = orders.reduce((a, b) =>
    new Date(a.created_at) < new Date(b.created_at) ? a : b
  )
  return timeAgo(oldest.created_at)
}

type ViralPotential = 'alto' | 'medio' | null

function getViralPotential(briefing: Record<string, string>): ViralPotential {
  const platforms = briefing.platforms ?? ''
  const hasTikTok = platforms.toLowerCase().includes('tiktok')
  const hasHook = !!briefing.openingHook?.trim()
  if (hasTikTok && hasHook) return 'alto'
  if (hasHook) return 'medio'
  return null
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded border ${className}`}
    >
      {children}
    </span>
  )
}

export default function FilaClient({ orders, editorId: _editorId }: { orders: OrderInQueue[]; editorId: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()

  async function handlePick(orderId: string) {
    setLoading(orderId)
    const res = await fetch(`/api/orders/${orderId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const data = await res.json()
      alert('Erro ao pegar pedido: ' + (data.error ?? res.status))
      setLoading(null)
      return
    }
    router.push('/em-andamento')
    router.refresh()
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
          <Film className="w-5 h-5 text-zinc-700" />
        </div>
        <p className="text-zinc-400 text-sm font-medium">Fila limpa.</p>
        <p className="text-zinc-700 text-xs mt-1">Descanse — novos pedidos chegam em breve.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <div
        className="bg-[#080809] border border-white/[0.06] rounded-2xl px-8 py-10 relative overflow-hidden"
        style={{ boxShadow: 'inset 40px 0 80px rgba(234,88,12,0.08)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">Editor</p>
            <h1 className="text-white font-black text-2xl tracking-tight">Mission Control</h1>
            <p className="text-zinc-500 text-sm mt-1">Escolha seu próximo job</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
              <p className="text-white font-black text-2xl leading-none">{orders.length}</p>
              <p className="text-zinc-600 text-[10px] mt-0.5 uppercase tracking-[0.1em] font-semibold">
                {orders.length === 1 ? 'pedido na fila' : 'pedidos na fila'}
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
              <p className="text-white font-black text-2xl leading-none">{oldestAge(orders)}</p>
              <p className="text-zinc-600 text-[10px] mt-0.5 uppercase tracking-[0.1em] font-semibold">mais antigo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order cards */}
      {orders.map((order, index) => {
        const urgent = isUrgent(order.deadline)
        const briefing = order.briefing ?? {}
        const isOpen = expanded === order.id
        const viralPotential = getViralPotential(briefing)

        // Parse platforms from comma-separated string
        const platforms: string[] = briefing.platforms
          ? briefing.platforms.split(',').map((p: string) => p.trim()).filter(Boolean)
          : []

        return (
          <div
            key={order.id}
            className="rounded-xl border overflow-hidden transition-all"
            style={{
              background: '#080809',
              borderColor: urgent ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
              boxShadow: urgent ? 'inset 0 0 40px rgba(220,38,38,0.04)' : 'none',
            }}
          >
            {/* Card body */}
            <div className="p-5">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-[9px] font-black tracking-[0.1em] text-zinc-700 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5">
                  #{index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-semibold">
                      {order.profiles?.name ?? 'Cliente'}
                    </span>
                    <span className="text-zinc-600 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(order.created_at)}
                    </span>
                    {urgent && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 border border-red-500/20 bg-red-500/[0.06] px-2 py-0.5 rounded-full shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        URGENTE
                      </span>
                    )}
                    {viralPotential === 'alto' && (
                      <span className="text-[10px] font-bold tracking-[0.08em] text-amber-400 border border-amber-500/20 bg-amber-500/[0.06] px-2 py-0.5 rounded-full">
                        POTENCIAL ALTO
                      </span>
                    )}
                    {viralPotential === 'medio' && (
                      <span className="text-[10px] font-bold tracking-[0.08em] text-blue-400 border border-blue-500/20 bg-blue-500/[0.06] px-2 py-0.5 rounded-full">
                        POTENCIAL MÉDIO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chips row */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {briefing.tone && (
                  <Chip className="text-zinc-500 border-white/[0.06] bg-white/[0.02]">
                    <Palette className="w-2.5 h-2.5" />
                    {TONE_LABELS[briefing.tone] ?? briefing.tone}
                  </Chip>
                )}
                {briefing.cta && briefing.cta !== 'nenhum' && (
                  <Chip className="text-zinc-500 border-white/[0.06] bg-white/[0.02]">
                    <Megaphone className="w-2.5 h-2.5" />
                    {CTA_LABELS[briefing.cta] ?? briefing.cta}
                  </Chip>
                )}
                {platforms.map(p => (
                  <Chip key={p} className="text-zinc-500 border-white/[0.06] bg-white/[0.02]">
                    {p}
                  </Chip>
                ))}
                {briefing.music && (
                  <Chip className="text-zinc-500 border-white/[0.06] bg-white/[0.02]">
                    <Music className="w-2.5 h-2.5" />
                    {briefing.music}
                  </Chip>
                )}
              </div>

              {/* Opening hook */}
              {briefing.openingHook && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2 mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700 mr-2">
                    💬 GANCHO
                  </span>
                  <span className="text-zinc-400 text-xs italic">"{briefing.openingHook}"</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePick(order.id)}
                  disabled={loading === order.id}
                  className="bg-white text-black hover:bg-zinc-100 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading === order.id ? 'Pegando...' : 'Pegar pedido'}
                </button>
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 border border-white/[0.08] hover:border-white/[0.15] px-3 py-1.5 rounded-lg transition-all"
                >
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Ver briefing
                </button>
              </div>
            </div>

            {/* Expanded briefing */}
            {isOpen && (
              <div className="border-t border-white/[0.05] bg-[#0c0c0e] px-5 py-5 space-y-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700">
                  Briefing Completo
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                      <Palette className="w-2.5 h-2.5" /> Tom
                    </p>
                    <p className="text-zinc-300 text-sm">{TONE_LABELS[briefing.tone] ?? briefing.tone ?? '—'}</p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                      <Megaphone className="w-2.5 h-2.5" /> CTA
                    </p>
                    <p className="text-zinc-300 text-sm">{CTA_LABELS[briefing.cta] ?? briefing.cta ?? '—'}</p>
                  </div>

                  {briefing.music && (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <Music className="w-2.5 h-2.5" /> Música
                      </p>
                      <p className="text-zinc-300 text-sm">{briefing.music}</p>
                    </div>
                  )}

                  {briefing.editingStyle && (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <Film className="w-2.5 h-2.5" /> Estilo
                      </p>
                      <p className="text-zinc-300 text-sm">{briefing.editingStyle}</p>
                    </div>
                  )}

                  {platforms.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1">Plataformas</p>
                      <p className="text-zinc-300 text-sm">{platforms.join(', ')}</p>
                    </div>
                  )}

                  {briefing.notes && (
                    <div className="md:col-span-2">
                      <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" /> Observações
                      </p>
                      <p className="text-zinc-300 text-sm whitespace-pre-line bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
                        {briefing.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/[0.05]">
                  <button
                    onClick={() => handlePick(order.id)}
                    disabled={loading === order.id}
                    className="w-full bg-white text-black hover:bg-zinc-100 font-bold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading === order.id ? 'Pegando...' : '✓ Confirmar e pegar esse pedido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
