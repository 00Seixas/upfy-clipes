export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Clock, CheckCircle, Zap, Film, ArrowRight } from 'lucide-react'

const PIPELINE: { key: string; label: string; color: string; bg: string; dot: string }[] = [
  { key: 'aguardando',         label: 'Aguardando',      color: 'text-zinc-400',    bg: 'bg-zinc-800/40',    dot: 'bg-zinc-600'    },
  { key: 'em_edicao',          label: 'Em Edição',       color: 'text-amber-400',   bg: 'bg-amber-950/30',   dot: 'bg-amber-400'   },
  { key: 'revisao_interna',    label: 'Revisão',         color: 'text-orange-400',  bg: 'bg-orange-950/30',  dot: 'bg-orange-400'  },
  { key: 'revisao_solicitada', label: 'Revisão',         color: 'text-orange-400',  bg: 'bg-orange-950/30',  dot: 'bg-orange-400'  },
  { key: 'aprovacao',          label: 'Aprovação',       color: 'text-orange-300',  bg: 'bg-orange-950/30',  dot: 'bg-orange-300'  },
  { key: 'entregue',           label: 'Entregue',        color: 'text-emerald-400', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
]

function statusInfo(status: string) {
  return PIPELINE.find(p => p.key === status) ?? PIPELINE[0]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (d > 0) return `${d}d atrás`
  if (h > 0) return `${h}h atrás`
  return 'agora'
}

export default async function ProducaoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')
  const userId = user?.id ?? ''

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, briefing, created_at, updated_at, deadline')
    .eq('client_id', userId)
    .not('status', 'in', '(cancelado,publicado)')
    .order('created_at', { ascending: false })

  const allOrders = orders ?? []
  const active    = allOrders.filter((o: { status: string }) => o.status !== 'entregue')
  const done      = allOrders.filter((o: { status: string }) => o.status === 'entregue')

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Produção</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Acompanhe cada pedido em tempo real.</p>
        </div>
        <Link
          href="/enviar-videos"
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo pedido
        </Link>
      </div>

      {/* Pipeline summary bar */}
      {active.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PIPELINE.filter(p => p.key !== 'entregue' && p.key !== 'revisao_solicitada').map(stage => {
            const count = allOrders.filter((o: { status: string }) => o.status === stage.key).length
            return (
              <div key={stage.key} className={`border rounded-lg p-3 text-center ${stage.bg} border-zinc-800/40`}>
                <p className={`text-xl font-bold ${count > 0 ? stage.color : 'text-zinc-700'}`}>{count}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5 leading-tight">{stage.label}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Active orders */}
      {active.length === 0 && done.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-medium">Nenhum pedido ainda</p>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Envie seu primeiro vídeo para começar a produção.</p>
          <Link href="/enviar-videos" className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Pedir primeiro clipe
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {active.length > 0 && (
            <>
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">Em produção</p>
              {active.map((order: { id: string; status: string; briefing: Record<string,string>; created_at: string; updated_at: string; deadline?: string }) => {
                const s = statusInfo(order.status)
                const tone = order.briefing?.tone ?? ''
                return (
                  <div key={order.id} className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/60 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${s.dot} animate-pulse`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                            {tone && <span className="text-zinc-700 text-xs">· {tone}</span>}
                          </div>
                          <p className="text-zinc-500 text-xs mt-0.5">Enviado {timeAgo(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {order.deadline && (
                          <p className="text-zinc-600 text-xs">
                            Prazo: {new Date(order.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Timeline mini */}
                    <div className="mt-4 flex items-center gap-1">
                      {['aguardando','em_edicao','revisao_interna','aprovacao','entregue'].map((stage, i) => {
                        const stageOrder = ['aguardando','em_edicao','revisao_interna','aprovacao','entregue']
                        const currentIdx = stageOrder.indexOf(order.status.replace('revisao_solicitada','revisao_interna').replace('atribuido','aguardando').replace('na_fila','aguardando').replace('em_analise','aguardando'))
                        const isActive  = i === currentIdx
                        const isDone    = i < currentIdx
                        return (
                          <div key={stage} className="flex-1 flex items-center gap-1">
                            <div className={`h-1 flex-1 rounded-full transition-all ${isDone ? 'bg-violet-500' : isActive ? 'bg-violet-500/60' : 'bg-zinc-800'}`} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {done.length > 0 && (
            <>
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mt-4">Entregues</p>
              {done.slice(0, 5).map((order: { id: string; status: string; created_at: string; updated_at: string }) => (
                <div key={order.id} className="flex items-center gap-3 bg-[#111113] border border-zinc-800/40 rounded-xl px-5 py-3 opacity-60">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-zinc-400 text-sm flex-1">
                    Pedido de {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-emerald-500 text-xs">Entregue {timeAgo(order.updated_at)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
