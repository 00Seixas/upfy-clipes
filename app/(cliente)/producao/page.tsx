export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, CheckCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string; bgGlow: string; step: number }> = {
  aguardando:         { label: 'Aguardando',  color: '#71717a', glow: 'rgba(113,113,122,0.5)', bgGlow: 'rgba(113,113,122,0.03)', step: 0 },
  em_analise:         { label: 'Em análise',  color: '#3b82f6', glow: 'rgba(59,130,246,0.6)',  bgGlow: 'rgba(59,130,246,0.04)',  step: 1 },
  na_fila:            { label: 'Na fila',     color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)',  bgGlow: 'rgba(139,92,246,0.04)', step: 1 },
  atribuido:          { label: 'Atribuído',   color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)',  bgGlow: 'rgba(139,92,246,0.04)', step: 1 },
  em_edicao:          { label: 'Em edição',   color: '#f59e0b', glow: 'rgba(245,158,11,0.6)',  bgGlow: 'rgba(245,158,11,0.04)', step: 2 },
  revisao_interna:    { label: 'Revisão',     color: '#f97316', glow: 'rgba(249,115,22,0.6)',  bgGlow: 'rgba(249,115,22,0.04)', step: 3 },
  revisao_solicitada: { label: 'Revisão',     color: '#f97316', glow: 'rgba(249,115,22,0.6)',  bgGlow: 'rgba(249,115,22,0.04)', step: 3 },
  aprovacao:          { label: 'Aprovando',   color: '#fb923c', glow: 'rgba(251,146,60,0.6)',  bgGlow: 'rgba(251,146,60,0.04)', step: 4 },
  pronto:             { label: 'Pronto',      color: '#10b981', glow: 'rgba(16,185,129,0.6)',  bgGlow: 'rgba(16,185,129,0.04)', step: 5 },
  entregue:           { label: 'Entregue',    color: '#10b981', glow: 'rgba(16,185,129,0.6)',  bgGlow: 'rgba(16,185,129,0.04)', step: 5 },
}

const PIPELINE_STEPS = ['Aguardando', 'Fila', 'Edição', 'Revisão', 'Aprovação', 'Entregue']

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor(diff / 60_000)
  if (d > 0) return `${d}d atrás`
  if (h > 0) return `${h}h atrás`
  if (m > 0) return `${m}min atrás`
  return 'agora'
}

export default async function ProducaoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const { data: orders } = await supabase
    .from('orders').select('id, status, briefing, created_at, updated_at, deadline').eq('client_id', userId).not('status', 'in', '(cancelado,publicado)').order('created_at', { ascending: false })

  const allOrders = orders ?? []
  const active = allOrders.filter((o: { status: string }) => o.status !== 'entregue')
  const done   = allOrders.filter((o: { status: string }) => o.status === 'entregue')

  const countByStatus = (keys: string[]) => allOrders.filter((o: { status: string }) => keys.includes(o.status)).length

  return (
    <div className="space-y-8 pb-16">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] mb-2">Central de Missão</p>
          <h1 className="text-4xl font-black text-white tracking-tight">Produção</h1>
          {active.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-zinc-500 text-sm">{active.length} pedido{active.length > 1 ? 's' : ''} em andamento</p>
            </div>
          )}
        </div>
        <Link href="/enviar-videos" className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-100 text-black text-sm font-bold rounded-xl transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" /> Novo pedido
        </Link>
      </div>

      {/* STAGE COUNTS */}
      {active.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { keys: ['aguardando','em_analise','na_fila','atribuido'], label: 'Aguardando', color: '#71717a' },
            { keys: ['em_edicao'], label: 'Em edição', color: '#f59e0b' },
            { keys: ['revisao_interna','revisao_solicitada'], label: 'Revisão', color: '#f97316' },
            { keys: ['aprovacao'], label: 'Aprovação', color: '#fb923c' },
            { keys: ['entregue'], label: 'Entregues', color: '#3f3f46' },
          ].map(stage => {
            const count = countByStatus(stage.keys)
            return (
              <div key={stage.label} className="bg-[#080809] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className="text-2xl font-black mb-1" style={{ color: count > 0 ? stage.color : '#27272a' }}>{count}</p>
                <p className="text-zinc-700 text-[10px] font-medium">{stage.label}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ORDERS */}
      {active.length === 0 && done.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <Plus className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold mb-2">Nenhum pedido ainda</p>
          <p className="text-zinc-700 text-sm max-w-xs mx-auto leading-relaxed mb-6">Envie seu primeiro vídeo para começar a produção.</p>
          <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-100 transition-colors">
            <Plus className="w-4 h-4" /> Pedir primeiro clipe
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">Em produção</p>
              {active.map((order: { id: string; status: string; briefing: Record<string,string>; created_at: string; updated_at: string; deadline?: string }) => {
                const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.aguardando
                const tone = order.briefing?.tone
                const revisionNotes = order.briefing?._revision_notes
                return (
                  <div key={order.id} className="bg-[#080809] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-5 transition-all duration-200"
                    style={{ boxShadow: `0 0 40px ${s.bgGlow}` }}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: s.color, boxShadow: `0 0 8px ${s.glow}` }} />
                        <div>
                          <span className="text-sm font-semibold" style={{ color: s.color }}>{s.label}</span>
                          {tone && <span className="text-zinc-700 text-xs ml-2">· {tone}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-700 text-xs">{timeAgo(order.created_at)}</p>
                        {order.deadline && <p className="text-zinc-700 text-xs">Prazo: {new Date(order.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>}
                      </div>
                    </div>
                    {revisionNotes && (
                      <div className="mb-4 border-l-2 border-orange-500/40 pl-3 py-1">
                        <p className="text-orange-400 text-[10px] uppercase tracking-wider font-bold mb-1">Revisão solicitada</p>
                        <p className="text-zinc-500 text-xs leading-relaxed">{revisionNotes}</p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        {PIPELINE_STEPS.map((step, i) => (
                          <span key={step} className="text-[9px] font-medium transition-colors"
                            style={{ color: i < s.step ? 'rgba(255,255,255,0.35)' : i === s.step ? s.color : 'rgba(255,255,255,0.1)' }}>
                            {step}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {PIPELINE_STEPS.map((_, i) => (
                          <div key={i} className="flex-1 h-px rounded-full transition-all duration-500"
                            style={{
                              background: i < s.step ? 'rgba(255,255,255,0.3)' : i === s.step ? s.color : 'rgba(255,255,255,0.05)',
                              boxShadow: i === s.step ? `0 0 8px ${s.glow}` : 'none',
                            }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mt-4">Concluídos</p>
              {done.slice(0, 8).map((order: { id: string; created_at: string; updated_at: string }) => (
                <div key={order.id} className="flex items-center gap-4 bg-[#080809] border border-white/[0.04] rounded-xl px-5 py-3.5 opacity-40 hover:opacity-60 transition-opacity">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-zinc-600 text-sm flex-1">Pedido de {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  <span className="text-zinc-700 text-xs">Entregue {timeAgo(order.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
