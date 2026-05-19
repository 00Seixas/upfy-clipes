export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Detalhe do Editor' }

interface Props {
  params: { id: string }
}

type DeliverableRow = {
  virality_grade: string | null
  approved_at: string | null
}

export default async function EditorDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const svc = createServiceClient()

  const [{ data: editor }, { data: deliverables }] = await Promise.all([
    svc.from('profiles').select('id, name, email').eq('id', params.id).single(),
    svc.from('deliverables')
      .select('virality_grade, approved_at')
      .eq('editor_id', params.id),
  ])

  const rows = (deliverables ?? []) as DeliverableRow[]
  const total = rows.length
  const approved = rows.filter(d => d.approved_at).length
  const viralCount = rows.filter(d => d.virality_grade === 'viral' || d.virality_grade === 'quente').length
  const taxaViral = total > 0 ? Math.round((viralCount / total) * 100) : 0

  // Nota média: frio=1, morno=2, quente=3, viral=4
  const GRADE_VALUE: Record<string, number> = { frio: 1, morno: 2, quente: 3, viral: 4 }
  const gradeSum = rows.reduce((acc, d) => acc + (GRADE_VALUE[d.virality_grade ?? ''] ?? 0), 0)
  const notaMedia = total > 0 ? (gradeSum / total).toFixed(1) : '—'

  return (
    <div className="space-y-6 pb-16">
      <div>
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Editor</p>
        <h1 className="text-3xl font-black text-white tracking-tight">
          {editor?.name ?? 'Editor'}
        </h1>
        {editor?.email && (
          <p className="text-zinc-500 text-sm mt-1">{editor.email}</p>
        )}
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl px-5 py-4">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Total de Clipes</p>
          <p className="text-white font-black text-2xl leading-none">{total}</p>
        </div>
        <div className="bg-[#080809] border border-white/[0.06] rounded-xl px-5 py-4">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Aprovados</p>
          <p className="text-white font-black text-2xl leading-none">{approved}</p>
        </div>
        <div className="bg-[#080809] border border-amber-500/20 rounded-xl px-5 py-4">
          <p className="text-amber-600 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Taxa Viral</p>
          <p className="text-amber-400 font-black text-2xl leading-none">{taxaViral}%</p>
          <p className="text-zinc-700 text-[10px] mt-0.5">quente + viral</p>
        </div>
        <div className="bg-[#080809] border border-violet-500/20 rounded-xl px-5 py-4">
          <p className="text-violet-600 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Nota Média</p>
          <p className="text-violet-400 font-black text-2xl leading-none">{notaMedia}</p>
          <p className="text-zinc-700 text-[10px] mt-0.5">de 4.0 máx</p>
        </div>
      </div>

      <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
        <p className="text-zinc-600 text-xs">ID: <span className="font-mono text-zinc-500">{params.id}</span></p>
        <p className="text-zinc-500 text-sm mt-2">Histórico de jobs e performance do editor.</p>
      </div>
    </div>
  )
}
