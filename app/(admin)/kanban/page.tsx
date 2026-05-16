export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import KanbanClient from '@/components/admin/kanban-client'

export default async function KanbanPage() {
  const supabase = createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, created_at, deadline,
      profiles!orders_client_id_fkey(id, name, whatsapp),
      editor:profiles!orders_editor_id_fkey(name),
      deliverables(id, clip_number, virality_grade, feedback, r2_key, filename)
    `)
    .in('status', ['aguardando', 'em_edicao', 'aprovacao', 'entregue'])
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Kanban de Produção</h1>
      <p className="text-zinc-400 text-sm mb-8">Acompanhe o fluxo de todos os pedidos.</p>
      <KanbanClient orders={(orders ?? []).map(o => ({
        ...o,
        profiles: Array.isArray(o.profiles) ? o.profiles[0] : o.profiles,
        editor: Array.isArray(o.editor) ? o.editor[0] : o.editor,
      })) as any} />
    </div>
  )
}
