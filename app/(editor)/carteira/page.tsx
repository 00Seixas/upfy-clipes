export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CarteiraClient from '@/components/editor/carteira-client'
import { getOrCreateWallet, fetchEditorEarnings, fetchPayouts, getOperationalSettings } from '@/lib/services/editor-wallet'

export default async function CarteiraPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['editor', 'admin'].includes(profile.role)) redirect('/login')

  const [wallet, earnings, payouts, settings] = await Promise.all([
    getOrCreateWallet(user.id),
    fetchEditorEarnings(user.id, 30),
    fetchPayouts({ editorId: user.id }),
    getOperationalSettings(),
  ])

  return (
    <CarteiraClient
      wallet={wallet}
      earnings={earnings}
      payouts={payouts}
      settings={{
        withdrawalFeeCents:     settings['payout_withdrawal_fee_cents']     ?? 499,
        minimumWithdrawalCents: settings['payout_minimum_withdrawal_cents']  ?? 2000,
      }}
    />
  )
}
