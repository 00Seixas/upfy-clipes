export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Upload, Film, Clock, Calendar, CheckCircle, Loader2, ArrowRight, Download } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando:   { label: 'Aguardando',   color: 'text-zinc-400' },
  em_analise:   { label: 'Em análise',   color: 'text-blue-400' },
  na_fila:      { label: 'Na fila',      color: 'text-violet-400' },
  atribuido:    { label: 'Atribuído',    color: 'text-violet-400' },
  em_edicao:    { label: 'Em edição',    color: 'text-amber-400' },
  revisao_interna: { label: 'Em revisão', color: 'text-orange-400' },
  aprovacao:    { label: 'Aprovando',    color: 'text-orange-400' },
  revisao_solicitada: { label: 'Revisão', color: 'text-orange-400' },
  pronto:       { label: 'Pronto',       color: 'text-emerald-400' },
  entregue:     { label: 'Entregue',     color: 'text-emerald-400' },
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const userId = user?.id ?? ''

  const [{ data: profile }, { data: contract }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', userId).single(),
    supabase.from('client_contracts').select('*').eq('user_id', userId).eq('status', 'ativo').single(),
    supabase.from('orders').select('id, status, created_at').eq('client_id', userId)
      .not('status', 'in', '(entregue,publicado,cancelado)')
      .order('created_at', { ascending: false }),
  ])

  // Get client's order IDs for deliverables query
  const { data: allOrders } = await supabase.from('orders').select('id').eq('client_id', userId)
  const orderIds = (allOrders ?? []).map((o: { id: string }) => o.id)

  // Last 3 approved deliverables
  const { data: recentClips } = orderIds.length
    ? await supabase
        .from('deliverables')
        .select('id, clip_number, delivered_at, virality_grade')
        .in('order_id', orderIds)
        .not('approved_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(3)
    : { data: [] }

  const clipsEntregues  = contract?.clips_delivered ?? 0
  const clipsTotal      = contract?.clips_total ?? 0
  const progressPct     = clipsTotal > 0 ? Math.round((clipsEntregues / clipsTotal) * 100) : 0
  const activeOrders    = orders ?? []

  const firstName = profile?.name?.split(' ')[0] ?? 'Cliente'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">Olá, {firstName}! 👋</h1>
        <p className="text-zinc-500 text-sm mt-1">Aqui está o resumo da sua conta.</p>
      </div>

      {/* Contract progress */}
      {contract && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-zinc-400 text-sm font-medium">Progresso do contrato</p>
            <p className="text-white text-sm font-semibold">{clipsEntregues} / {clipsTotal} clipes</p>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-600">
            <span>{progressPct}% concluído</span>
            {contract.end_date && (
              <span>Até {new Date(contract.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            )}
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <Film className="w-4 h-4 text-violet-400 mb-2" />
          <p className="text-2xl font-bold text-white">{clipsEntregues}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Clipes entregues</p>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <Loader2 className="w-4 h-4 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Em produção</p>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{clipsTotal - clipsEntregues}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Clipes restantes</p>
        </div>
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-4">
          <Calendar className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{clipsTotal}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Total contratado</p>
        </div>
      </div>

      {/* Orders in progress */}
      {activeOrders.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-3">Pedidos em andamento</p>
          <div className="space-y-2">
            {activeOrders.map((order: { id: string; status: string; created_at: string }) => {
              const s = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-zinc-400' }
              return (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-300 text-xs">
                      {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent clips */}
      {(recentClips ?? []).length > 0 && (
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">Últimos clipes entregues</p>
            <Link href="/meus-clipes" className="text-violet-400 text-xs hover:text-violet-300 transition-colors flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(recentClips ?? []).map((clip: { id: string; clip_number: number; delivered_at: string; virality_grade: string }) => (
              <div key={clip.id} className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Film className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex-1">
                  <p className="text-zinc-300 text-xs font-medium">Clipe #{clip.clip_number}</p>
                  <p className="text-zinc-600 text-xs">
                    {new Date(clip.delivered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <a
                  href={`/api/clips/${clip.id}/download`}
                  className="flex items-center gap-1 text-zinc-500 hover:text-white text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Link
        href="/enviar-videos"
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-xl transition-colors"
      >
        <Upload className="w-4 h-4" />
        Enviar vídeo para produção
      </Link>
    </div>
  )
}
