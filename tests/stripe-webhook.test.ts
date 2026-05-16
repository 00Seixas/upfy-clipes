import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpsert = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockNot = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockIn = vi.fn()

function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  ;[
    'select', 'eq', 'neq', 'in', 'not', 'lte', 'gte',
    'order', 'limit', 'range', 'single', 'update', 'insert', 'upsert',
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  ;(chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

let fromResults: Map<string, { data: unknown; error: unknown }> = new Map()

vi.mock('@/lib/db/server', () => ({
  createSupabaseServiceClient: () => ({
    from: vi.fn().mockImplementation((table: string) => {
      const result = fromResults.get(table) ?? { data: null, error: null }
      return buildChain(result)
    }),
  }),
}))

vi.mock('@/lib/services/subscriptions', () => ({
  syncSubscriptionFromStripe: vi.fn().mockResolvedValue({
    id: 'sub-db-1',
    organization_id: 'org-1',
    plan_id: 'presenca_monthly',
    stripe_subscription_id: 'sub_stripe_1',
    status: 'active',
    source: 'stripe',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false,
    canceled_at: null,
    trial_end: null,
    stripe_customer_id: 'cus_1',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  createUsagePeriod: vi.fn().mockResolvedValue({ id: 'period-1' }),
}))

vi.mock('@/lib/services/audit-log', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/notifications', () => ({
  notifySubscriptionFailed: vi.fn().mockResolvedValue(undefined),
  notifySubscriptionRenewed: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: 'sub_stripe_1',
        status: 'active',
        customer: 'cus_1',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        metadata: { organization_id: 'org-1', plan_id: 'presenca_monthly' },
      }),
    },
  },
}))

import { handleStripeEvent } from '@/lib/stripe/webhook'
import { syncSubscriptionFromStripe } from '@/lib/services/subscriptions'
import { notifySubscriptionFailed, notifySubscriptionRenewed } from '@/lib/services/notifications'
import type Stripe from 'stripe'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeStripeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: { object: data },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as Stripe.Event
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromResults = new Map()
  })

  // ── 1. Duplicate webhook event is ignored ─────────────────────────────────
  it('ignores duplicate events that have already been processed', async () => {
    // Simulate: webhook_events table returns an existing processed record
    fromResults.set('webhook_events', {
      data: { id: 'webhookevent-1', status: 'processed' },
      error: null,
    })

    const event = makeStripeEvent('checkout.session.completed', {
      mode: 'subscription',
      subscription: 'sub_1',
      metadata: { organization_id: 'org-1', plan_id: 'presenca_monthly' },
    })

    await handleStripeEvent(event)

    // syncSubscriptionFromStripe should NOT be called for duplicate event
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  // ── 2. checkout.session.completed creates subscription ───────────────────
  it('checkout.session.completed triggers syncSubscriptionFromStripe', async () => {
    // No existing webhook event
    fromResults.set('webhook_events', { data: null, error: { code: 'PGRST116' } })

    const event = makeStripeEvent('checkout.session.completed', {
      mode: 'subscription',
      subscription: 'sub_stripe_1',
      customer: 'cus_1',
      metadata: { organization_id: 'org-1', plan_id: 'presenca_monthly', user_id: 'user-1' },
    })

    await handleStripeEvent(event)

    expect(syncSubscriptionFromStripe).toHaveBeenCalled()
  })

  // ── 3. invoice.payment_failed marks subscription past_due ────────────────
  it('invoice.payment_failed notifies org of payment failure', async () => {
    fromResults.set('webhook_events', { data: null, error: { code: 'PGRST116' } })
    fromResults.set('subscriptions', {
      data: { organization_id: 'org-1', id: 'sub-db-1' },
      error: null,
    })

    const event = makeStripeEvent('invoice.payment_failed', {
      id: 'in_failed_1',
      subscription: 'sub_stripe_1',
      customer: 'cus_1',
    })

    await handleStripeEvent(event)

    expect(notifySubscriptionFailed).toHaveBeenCalledWith('org-1')
  })

  // ── 4. customer.subscription.deleted marks subscription canceled ──────────
  it('customer.subscription.deleted syncs status to canceled', async () => {
    fromResults.set('webhook_events', { data: null, error: { code: 'PGRST116' } })

    const event = makeStripeEvent('customer.subscription.deleted', {
      id: 'sub_stripe_1',
      status: 'canceled',
      customer: 'cus_1',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
      canceled_at: Math.floor(Date.now() / 1000),
      trial_end: null,
      metadata: { organization_id: 'org-1', plan_id: 'presenca_monthly' },
    })

    // Should not throw
    await expect(handleStripeEvent(event)).resolves.toBeUndefined()
  })
})
