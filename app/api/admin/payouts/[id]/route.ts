import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { approvePayout, markPayoutPaid, rejectPayout } from '@/lib/services/editor-wallet'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payoutId  = params.id
  const adminId   = user.id
  const adminName = (profile as { name: string }).name ?? 'Admin'
  const { action, notes } = await req.json() as { action: string; notes?: string }

  try {
    if (action === 'approve') {
      await approvePayout({ payoutId, approvedBy: adminId, approvedByName: adminName })
    } else if (action === 'mark_paid') {
      await markPayoutPaid({ payoutId, adminId, adminName })
    } else if (action === 'reject') {
      await rejectPayout({ payoutId, adminId, adminName, notes })
    } else {
      return NextResponse.json({ error: `Ação inválida: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
