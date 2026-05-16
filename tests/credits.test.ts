import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/db/server', () => ({
  createSupabaseServiceClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}))

import {
  getCreditBalance,
  addCredits,
  consumeCredits,
  refundCredits,
} from '@/lib/services/credits'
import { InsufficientCreditsError } from '@/lib/errors'
import type { CreditLedgerRow } from '@/types/database'

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeLedgerRow(overrides: Partial<CreditLedgerRow> = {}): CreditLedgerRow {
  return {
    id: 'ledger-1',
    organization_id: 'org-1',
    amount: 1800,
    direction: 'debit',
    reason: 'clip_request',
    related_entity_type: null,
    related_entity_id: null,
    idempotency_key: 'key-1',
    balance_after: 3200,
    note: null,
    created_by: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function setupFromChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('credits service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. consumeCredits fails when balance < amount ─────────────────────────
  it('consumeCredits throws InsufficientCreditsError when balance is insufficient', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'Insufficient credits: have 500, need 1800',
      },
    })

    await expect(
      consumeCredits({
        organizationId: 'org-1',
        amount: 1800,
        reason: 'clip_request',
        idempotencyKey: 'test-key-1',
      })
    ).rejects.toThrow(InsufficientCreditsError)
  })

  // ── 2. consumeCredits succeeds and balance decreases ─────────────────────
  it('consumeCredits succeeds and returns correct balanceAfter', async () => {
    const ledger = makeLedgerRow({ balance_after: 3200 })
    mockRpc.mockResolvedValue({ data: ledger, error: null })

    const result = await consumeCredits({
      organizationId: 'org-1',
      amount: 1800,
      reason: 'clip_request',
      idempotencyKey: 'test-key-2',
    })

    expect(result.balanceAfter).toBe(3200)
    expect(mockRpc).toHaveBeenCalledWith(
      'consume_credits',
      expect.objectContaining({
        p_org_id: 'org-1',
        p_amount: 1800,
        p_idempotency_key: 'test-key-2',
      })
    )
  })

  // ── 3. Double submit with same idempotency_key doesn't double-debit ───────
  it('consumeCredits with duplicate idempotency_key returns existing ledger row without double-debit', async () => {
    const ledger = makeLedgerRow({ idempotency_key: 'dup-key', balance_after: 3200 })
    // The SQL function returns the existing row on duplicate key
    mockRpc.mockResolvedValue({ data: ledger, error: null })

    const result1 = await consumeCredits({
      organizationId: 'org-1',
      amount: 1800,
      reason: 'clip_request',
      idempotencyKey: 'dup-key',
    })

    const result2 = await consumeCredits({
      organizationId: 'org-1',
      amount: 1800,
      reason: 'clip_request',
      idempotencyKey: 'dup-key',
    })

    // Both calls should return the same balance (no double debit)
    expect(result1.balanceAfter).toBe(result2.balanceAfter)
    // rpc is called twice (idempotency handled by SQL function)
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  // ── 4. addCredits increases balance ──────────────────────────────────────
  it('addCredits increases balance by the specified amount', async () => {
    const ledger = makeLedgerRow({
      direction: 'credit',
      amount: 10000,
      balance_after: 15000,
    })
    mockRpc.mockResolvedValue({ data: ledger, error: null })

    const result = await addCredits({
      organizationId: 'org-1',
      amount: 10000,
      reason: 'purchase',
      idempotencyKey: 'add-key-1',
    })

    expect(result.balanceAfter).toBe(15000)
    expect(mockRpc).toHaveBeenCalledWith(
      'add_credits',
      expect.objectContaining({
        p_org_id: 'org-1',
        p_amount: 10000,
        p_reason: 'purchase',
        p_idempotency_key: 'add-key-1',
      })
    )
  })

  // ── 5. refundCredits creates reversal entry ───────────────────────────────
  it('refundCredits creates a reversal ledger entry with derived idempotency key', async () => {
    const ledger = makeLedgerRow({
      direction: 'credit',
      reason: 'reversal',
      idempotency_key: 'refund:original-key-1',
      balance_after: 6800,
    })
    mockRpc.mockResolvedValue({ data: ledger, error: null })

    const result = await refundCredits({
      organizationId: 'org-1',
      amount: 1800,
      originalIdempotencyKey: 'original-key-1',
    })

    expect(result.balanceAfter).toBe(6800)
    expect(mockRpc).toHaveBeenCalledWith(
      'add_credits',
      expect.objectContaining({
        p_idempotency_key: 'refund:original-key-1',
        p_reason: 'reversal',
        p_amount: 1800,
      })
    )
  })
})
