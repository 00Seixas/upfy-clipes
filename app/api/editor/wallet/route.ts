import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrCreateWallet, fetchEditorEarnings, fetchPayouts, getOperationalSettings } from '@/lib/services/editor-wallet'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [wallet, earnings, payouts, settings] = await Promise.all([
    getOrCreateWallet(user.id),
    fetchEditorEarnings(user.id, 20),
    fetchPayouts({ editorId: user.id, limit: 10 }),
    getOperationalSettings(),
  ])

  return NextResponse.json({ wallet, earnings, payouts, settings })
}
