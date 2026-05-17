export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanceiroClient from '@/components/admin/financeiro-client'
import { fetchPayouts, getOperationalSettings } from '@/lib/services/editor-wallet'

export default async function FinanceiroPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const [payouts, settings] = await Promise.all([
    fetchPayouts({ limit: 100 }),
    getOperationalSettings(),
  ])

  // Calculate summary
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const totalPaidThisMonthCents = payouts
    .filter((p) => p.status === 'paid' && p.paid_at && p.paid_at >= startOfMonth)
    .reduce((s, p) => s + p.amount_net_cents, 0)

  const pendingPayouts = payouts.filter((p) => ['pending', 'approved'].includes(p.status))
  const totalPendingCents = pendingPayouts.reduce((s, p) => s + p.amount_requested_cents, 0)

  const totalProcessingCents = payouts
    .filter((p) => p.status === 'processing')
    .reduce((s, p) => s + p.amount_requested_cents, 0)

  return (
    <FinanceiroClient
      payouts={payouts}
      settings={{
        payoutValuePerClipCents: settings['payout_value_per_clip_cents']     ?? 1000,
        withdrawalFeeCents:      settings['payout_withdrawal_fee_cents']      ?? 499,
        minimumWithdrawalCents:  settings['payout_minimum_withdrawal_cents']  ?? 2000,
      }}
      summary={{
        totalPaidThisMonthCents,
        totalPendingCents,
        totalProcessingCents,
        payoutsAwaitingApproval: pendingPayouts.length,
      }}
    />
  )
}
