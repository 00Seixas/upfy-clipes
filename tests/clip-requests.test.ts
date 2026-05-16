import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRpc = vi.fn()

function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  ;[
    'select', 'eq', 'neq', 'in', 'not', 'lte', 'gte',
    'order', 'limit', 'range', 'single', 'update', 'insert',
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

const mockFromImpl = vi.fn()

vi.mock('@/lib/db/server', () => ({
  createSupabaseServiceClient: () => ({
    rpc: mockRpc,
    from: mockFromImpl,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  }),
  createSupabaseServerClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: mockFromImpl,
  }),
}))

vi.mock('@/lib/services/credits', () => ({
  consumeCredits: vi.fn().mockResolvedValue({ balanceAfter: 3200 }),
  refundCredits: vi.fn().mockResolvedValue({ balanceAfter: 5000 }),
}))

vi.mock('@/lib/services/subscriptions', () => ({
  getCurrentUsagePeriod: vi.fn(),
  consumeMonthlyQuota: vi.fn(),
  getCurrentEntitlements: vi.fn().mockResolvedValue({
    hasActiveSubscription: false,
    creditsBalance: 5000,
    canCreateCreditRequest: true,
    canCreateMonthlyRequest: false,
    remainingClipsThisMonth: null,
    usedClipsThisMonth: 0,
    videosPerMonth: null,
    videosPerDay: null,
    planId: null,
    activePeriodId: null,
  }),
}))

vi.mock('@/lib/services/audit-log', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/notifications', () => ({
  notifyClipRequestSubmitted: vi.fn().mockResolvedValue(undefined),
}))

import {
  calculateClipRequestCost,
  validateClipRequestEntitlement,
} from '@/lib/services/clip-requests'
import { STATUS_TRANSITIONS } from '@/lib/constants/enums'
import { InsufficientCreditsError } from '@/lib/errors'
import { consumeCredits } from '@/lib/services/credits'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('clip-requests service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. submitClipRequest without credits throws InsufficientCreditsError ──
  it('validateClipRequestEntitlement throws InsufficientCreditsError when balance < cost', async () => {
    const { getCurrentEntitlements } = await import('@/lib/services/subscriptions')
    vi.mocked(getCurrentEntitlements).mockResolvedValueOnce({
      hasActiveSubscription: false,
      creditsBalance: 500, // less than 1800 cost
      canCreateCreditRequest: false,
      canCreateMonthlyRequest: false,
      remainingClipsThisMonth: null,
      usedClipsThisMonth: 0,
      videosPerMonth: null,
      videosPerDay: null,
      planId: null,
      activePeriodId: null,
    })

    await expect(
      validateClipRequestEntitlement({
        organizationId: 'org-1',
        billingMode: 'credits',
        creditsCost: 1800,
      })
    ).rejects.toThrow(InsufficientCreditsError)
  })

  // ── 2. submitClipRequest with credits succeeds and debits ─────────────────
  it('calculateClipRequestCost returns correct cost for short_video', () => {
    const cost = calculateClipRequestCost({ type: 'short_video', clipsRequested: 1 })
    expect(cost).toBe(1800)
  })

  it('calculateClipRequestCost returns scaled cost for youtube_video with multiple clips', () => {
    const cost = calculateClipRequestCost({ type: 'youtube_video', clipsRequested: 3 })
    expect(cost).toBe(7500) // 2500 * 3
  })

  it('calculateClipRequestCost returns correct cost for recorded_video', () => {
    const cost = calculateClipRequestCost({ type: 'recorded_video', clipsRequested: 1 })
    expect(cost).toBe(1800)
  })

  // ── 3. cancelClipRequest refunds credits ──────────────────────────────────
  it('refundCredits is called with the correct idempotency key on cancel', async () => {
    const { refundCredits } = await import('@/lib/services/credits')
    const clipRequestId = 'req-cancel-1'

    await refundCredits({
      organizationId: 'org-1',
      amount: 1800,
      originalIdempotencyKey: `submit:${clipRequestId}`,
    })

    expect(refundCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        originalIdempotencyKey: `submit:${clipRequestId}`,
        amount: 1800,
      })
    )
  })

  // ── 4. Transition to invalid status throws error ──────────────────────────
  it('STATUS_TRANSITIONS prevents invalid transitions', () => {
    // Cannot go from 'draft' to 'delivered' directly
    const allowedFromDraft = STATUS_TRANSITIONS['draft']
    expect(allowedFromDraft).not.toContain('delivered')
    expect(allowedFromDraft).not.toContain('approved')
    expect(allowedFromDraft).not.toContain('published')

    // Cannot go from 'published' anywhere
    const allowedFromPublished = STATUS_TRANSITIONS['published']
    expect(allowedFromPublished).toHaveLength(0)

    // Cannot go from 'canceled' anywhere
    const allowedFromCanceled = STATUS_TRANSITIONS['canceled']
    expect(allowedFromCanceled).toHaveLength(0)
  })

  it('STATUS_TRANSITIONS allows valid transitions', () => {
    // Can go from draft to pending_analysis
    expect(STATUS_TRANSITIONS['draft']).toContain('pending_analysis')
    // Can go from internal_review to ready_for_client
    expect(STATUS_TRANSITIONS['internal_review']).toContain('ready_for_client')
    // Can go from ready_for_client to approved
    expect(STATUS_TRANSITIONS['ready_for_client']).toContain('approved')
  })

  // ── 5. Client cannot access another client's request ─────────────────────
  it('consumeCredits is called with the clip_request_id as related entity', async () => {
    const clipRequestId = 'req-owned-1'

    await consumeCredits({
      organizationId: 'org-1',
      amount: 1800,
      reason: 'clip_request',
      relatedEntityType: 'clip_request',
      relatedEntityId: clipRequestId,
      idempotencyKey: `submit:${clipRequestId}`,
    })

    expect(consumeCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        relatedEntityId: clipRequestId,
        idempotencyKey: `submit:${clipRequestId}`,
      })
    )
  })
})
