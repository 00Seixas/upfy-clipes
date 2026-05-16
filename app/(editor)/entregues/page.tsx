export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function EntreguesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select(`
      id, clip_number, virality_grade, feedback, delivered_at, approved_at,
      orders!inner(client_id, profiles!orders_client_id_fkey(name))
    `)
    .eq('editor_id', user.id)
    .order('delivered_at', { ascending: false })

  const VIRALITY_CONFIG = {
    frio: { label: 'Frio', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    morno: { label: 'Morno', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    quente: { label: 'Quente', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    viral: { label: 'Viral', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Entregues</h1>
      <p className="text-zinc-400 text-sm mb-8">Histórico dos seus clipes finalizados.</p>

      {!deliverables?.length ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">Nenhum clipe entregue ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deliverables.map(d => {
            const vConfig = VIRALITY_CONFIG[d.virality_grade as keyof typeof VIRALITY_CONFIG]
            const order = d.orders as unknown as { profiles: { name: string } }
            return (
              <div key={d.id} className="bg-[#111113] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">Clipe {d.clip_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${vConfig?.color}`}>{vConfig?.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.approved_at ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                      {d.approved_at ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs">
                    {order?.profiles?.name} •{' '}
                    {new Date(d.delivered_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
