export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import EditoresClient from '@/components/admin/editores-page-client'

export default async function EditoresPage() {
  const supabase = createServiceClient()

  const { data: editors } = await supabase
    .from('profiles')
    .select('id, name, email, created_at')
    .eq('role', 'editor')
    .order('created_at', { ascending: false })

  const editorIds = (editors ?? []).map((e: { id: string }) => e.id)

  const [{ data: allDeliverables }, { data: monthDeliverables }] = await Promise.all([
    editorIds.length
      ? supabase.from('deliverables').select('editor_id').in('editor_id', editorIds)
      : Promise.resolve({ data: [] }),
    editorIds.length
      ? supabase.from('deliverables').select('editor_id').in('editor_id', editorIds)
          .gte('delivered_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      : Promise.resolve({ data: [] }),
  ])

  const clipCounts: Record<string, number> = {}
  for (const d of allDeliverables ?? []) clipCounts[d.editor_id] = (clipCounts[d.editor_id] ?? 0) + 1

  const monthCounts: Record<string, number> = {}
  for (const d of monthDeliverables ?? []) monthCounts[d.editor_id] = (monthCounts[d.editor_id] ?? 0) + 1

  const enriched = (editors ?? []).map((e: { id: string; name: string; email: string; created_at: string }) => ({
    ...e,
    total_clips: clipCounts[e.id] ?? 0,
    month_clips: monthCounts[e.id] ?? 0,
  }))

  return (
    <div>
      <div className="mb-8">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Pessoas</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Editores</h1>
        <p className="text-zinc-500 text-sm mt-1">Gerencie os editores da equipe.</p>
      </div>
      <EditoresClient initialEditors={enriched} />
    </div>
  )
}
