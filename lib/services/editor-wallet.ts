import { createServiceClient } from '@/lib/supabase/server'
import type { EditorWallet, EditorEarning, EditorPayoutRequest } from '@/types/domain'
import { logPayoutAction } from '@/lib/services/audit'

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function getOrCreateWallet(editorId: string): Promise<EditorWallet> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('editor_wallets')
    .select('*')
    .eq('editor_id', editorId)
    .single()

  if (existing) return existing as EditorWallet

  const { data: created, error } = await supabase
    .from('editor_wallets')
    .insert({ editor_id: editorId })
    .select()
    .single()

  if (error || !created) throw new Error(`Failed to create wallet: ${error?.message}`)
  return created as EditorWallet
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export async function creditEarning(params: {
  editorId:    string
  orderId:     string
  grossCents:  number
  description?: string
}): Promise<EditorEarning> {
  const supabase = createServiceClient()
  const { editorId, orderId, grossCents, description } = params

  // Idempotent: return existing if already credited
  const { data: existing } = await supabase
    .from('editor_earnings')
    .select('*')
    .eq('editor_id', editorId)
    .eq('order_id', orderId)
    .single()

  if (existing) return existing as EditorEarning

  const { data: earning, error } = await supabase
    .from('editor_earnings')
    .insert({
      editor_id:   editorId,
      order_id:    orderId,
      gross_cents: grossCents,
      fee_cents:   0,
      net_cents:   grossCents,
      status:      'pending',
      description: description ?? 'Clipe aprovado',
    })
    .select()
    .single()

  if (error || !earning) throw new Error(`Failed to create earning: ${error?.message}`)

  // Update wallet pending balance
  const wallet = await getOrCreateWallet(editorId)
  await supabase
    .from('editor_wallets')
    .update({
      balance_pending_cents: wallet.balance_pending_cents + grossCents,
      total_earned_cents:    wallet.total_earned_cents + grossCents,
    })
    .eq('editor_id', editorId)

  return earning as EditorEarning
}

export async function makeEarningsAvailable(editorId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: pendingEarnings } = await supabase
    .from('editor_earnings')
    .select('id, net_cents')
    .eq('editor_id', editorId)
    .eq('status', 'pending')

  if (!pendingEarnings || pendingEarnings.length === 0) return

  const total = (pendingEarnings as { net_cents: number }[]).reduce((s, e) => s + e.net_cents, 0)

  await supabase
    .from('editor_earnings')
    .update({ status: 'available' })
    .eq('editor_id', editorId)
    .eq('status', 'pending')

  const wallet = await getOrCreateWallet(editorId)
  await supabase
    .from('editor_wallets')
    .update({
      balance_pending_cents:   Math.max(0, wallet.balance_pending_cents - total),
      balance_available_cents: wallet.balance_available_cents + total,
    })
    .eq('editor_id', editorId)
}

export async function fetchEditorEarnings(
  editorId: string,
  limit = 20,
  offset = 0
): Promise<EditorEarning[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('editor_earnings')
    .select('*')
    .eq('editor_id', editorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return (data ?? []) as EditorEarning[]
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

export async function requestPayout(params: {
  editorId:    string
  amountCents: number
  pixKey:      string
  pixKeyType:  string
}): Promise<EditorPayoutRequest> {
  const supabase = createServiceClient()
  const { editorId, amountCents, pixKey, pixKeyType } = params

  // Fetch settings
  const { data: settings } = await supabase
    .from('operational_settings')
    .select('key, value')
    .in('key', ['payout_withdrawal_fee_cents', 'payout_minimum_withdrawal_cents'])

  const settingsMap: Record<string, number> = {}
  for (const s of settings ?? []) settingsMap[s.key] = Number(s.value)

  const feeCents = settingsMap['payout_withdrawal_fee_cents']      ?? 499
  const minCents = settingsMap['payout_minimum_withdrawal_cents']  ?? 2000

  if (amountCents < minCents) {
    throw new Error(`Valor mínimo para saque é ${formatCents(minCents)}`)
  }

  const netCents = amountCents - feeCents
  if (netCents <= 0) throw new Error('Valor insuficiente após taxa de saque')

  const wallet = await getOrCreateWallet(editorId)
  if (wallet.balance_available_cents < amountCents) {
    throw new Error('Saldo disponível insuficiente')
  }

  // Check for existing pending payouts
  const { data: inProgress } = await supabase
    .from('editor_payout_requests')
    .select('id')
    .eq('editor_id', editorId)
    .in('status', ['pending', 'approved', 'processing'])

  if (inProgress && inProgress.length > 0) {
    throw new Error('Já existe um saque em andamento. Aguarde a conclusão.')
  }

  const { data: payout, error } = await supabase
    .from('editor_payout_requests')
    .insert({
      editor_id:              editorId,
      amount_requested_cents: amountCents,
      fee_cents:              feeCents,
      amount_net_cents:       netCents,
      pix_key:                pixKey,
      pix_key_type:           pixKeyType,
      status:                 'pending',
    })
    .select()
    .single()

  if (error || !payout) throw new Error(`Failed to create payout: ${error?.message}`)

  // Reserve balance: available → processing
  await supabase
    .from('editor_wallets')
    .update({
      balance_available_cents:  wallet.balance_available_cents - amountCents,
      balance_processing_cents: wallet.balance_processing_cents + amountCents,
    })
    .eq('editor_id', editorId)

  return payout as EditorPayoutRequest
}

export async function approvePayout(params: {
  payoutId:       string
  approvedBy:     string
  approvedByName: string
}): Promise<void> {
  const supabase = createServiceClient()
  const { payoutId, approvedBy, approvedByName } = params

  await supabase
    .from('editor_payout_requests')
    .update({
      status:      'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', payoutId)
    .eq('status', 'pending')

  await logPayoutAction({
    actorId:   approvedBy,
    actorName: approvedByName,
    actorRole: 'admin',
    payoutId,
    action:    'payout.approved',
  })
}

export async function markPayoutPaid(params: {
  payoutId:  string
  adminId:   string
  adminName: string
}): Promise<void> {
  const supabase = createServiceClient()
  const { payoutId, adminId, adminName } = params

  const { data: payout } = await supabase
    .from('editor_payout_requests')
    .select('editor_id, amount_requested_cents, amount_net_cents')
    .eq('id', payoutId)
    .single()

  if (!payout) throw new Error('Payout não encontrado')

  await supabase
    .from('editor_payout_requests')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payoutId)
    .in('status', ['approved', 'processing'])

  // Reduce processing balance
  const wallet = await getOrCreateWallet(payout.editor_id)
  await supabase
    .from('editor_wallets')
    .update({
      balance_processing_cents: Math.max(0, wallet.balance_processing_cents - payout.amount_requested_cents),
    })
    .eq('editor_id', payout.editor_id)

  // Mark related earnings as paid
  await supabase
    .from('editor_earnings')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('editor_id', payout.editor_id)
    .eq('status', 'available')

  await logPayoutAction({
    actorId:   adminId,
    actorName: adminName,
    actorRole: 'admin',
    payoutId,
    action:    'payout.paid',
    metadata:  { amount_net_cents: payout.amount_net_cents },
  })
}

export async function rejectPayout(params: {
  payoutId:  string
  adminId:   string
  adminName: string
  notes?:    string
}): Promise<void> {
  const supabase = createServiceClient()
  const { payoutId, adminId, adminName, notes } = params

  const { data: payout } = await supabase
    .from('editor_payout_requests')
    .select('editor_id, amount_requested_cents')
    .eq('id', payoutId)
    .single()

  if (!payout) throw new Error('Payout não encontrado')

  await supabase
    .from('editor_payout_requests')
    .update({
      status:      'rejected',
      rejected_at: new Date().toISOString(),
      admin_notes: notes ?? null,
    })
    .eq('id', payoutId)
    .eq('status', 'pending')

  // Restore available balance
  const wallet = await getOrCreateWallet(payout.editor_id)
  await supabase
    .from('editor_wallets')
    .update({
      balance_available_cents:  wallet.balance_available_cents + payout.amount_requested_cents,
      balance_processing_cents: Math.max(0, wallet.balance_processing_cents - payout.amount_requested_cents),
    })
    .eq('editor_id', payout.editor_id)

  await logPayoutAction({
    actorId:   adminId,
    actorName: adminName,
    actorRole: 'admin',
    payoutId,
    action:    'payout.rejected',
    metadata:  { notes },
  })
}

export async function fetchPayouts(params?: {
  editorId?: string
  status?:   string
  limit?:    number
}): Promise<EditorPayoutRequest[]> {
  const supabase = createServiceClient()
  const limit = params?.limit ?? 50

  let query = supabase
    .from('editor_payout_requests')
    .select('*, editor:profiles!editor_id(name, whatsapp)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params?.editorId) query = query.eq('editor_id', params.editorId)
  if (params?.status)   query = query.eq('status', params.status)

  const { data } = await query
  return (data ?? []) as unknown as EditorPayoutRequest[]
}

export async function getOperationalSettings(): Promise<Record<string, number>> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('operational_settings').select('key, value')

  const settings: Record<string, number> = {}
  for (const row of data ?? []) {
    settings[row.key] = Number(row.value)
  }
  return settings
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}
