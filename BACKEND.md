# UPFY Clipes — Backend Guide

## Running Migrations

```bash
# Push all migrations to your Supabase project
npx supabase db push

# Or run individual migration files via the Supabase SQL editor
# Apply in order: 002 → 003 → ... → 013
```

## Setting Up Seeds

After running migrations, create test users via the Supabase Dashboard:
1. Go to Authentication → Users → Add user
2. Run the SQL comments in `013_seeds.sql` for org/credit setup
3. Manually set roles: `UPDATE profiles SET role = 'admin' WHERE email = 'admin@upfy.com.br'`

## Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`
5. Add Stripe Price IDs to monthly_plans rows (`stripe_price_id` column)

## R2 Bucket Configuration

1. Create bucket in Cloudflare R2 dashboard
2. Add CORS policy for direct browser uploads:
```json
[{"AllowedOrigins": ["https://your-domain.com"],"AllowedMethods": ["PUT","GET"],"AllowedHeaders": ["*"],"MaxAgeSeconds": 3600}]
```
3. Set `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

## Running Tests

```bash
# Install vitest first (not yet in package.json)
npm install -D vitest

# Run all tests
npx vitest

# Run in watch mode
npx vitest --watch
```

**Required installs not in package.json:** `vitest` (dev dependency)

## Critical Security Notes

- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** — it bypasses RLS. Only use in server-side code via `createSupabaseServiceClient()`.
- **Webhook signature verification** — all Stripe webhooks are verified via `stripe.webhooks.constructEvent()` before processing.
- **Signed URLs** — video files are never served directly. All downloads use time-limited signed URLs (15 min default) generated server-side.
- **OAuth tokens** — stored encrypted in DB (`access_token_encrypted`, `refresh_token_encrypted`). App layer must encrypt/decrypt using `ENCRYPTION_KEY`. Tokens are NEVER returned to the client.
- **object_key** — the R2 object key is stored in `assets.object_key` but always stripped from API responses. Only signed URLs are returned.

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Service client vs user client | User client (anon key) for reads respecting RLS; service client (service role) for writes that must bypass RLS (webhooks, credit ops) |
| Idempotency on all credit ops | The `consume_credits` and `add_credits` SQL functions accept an `idempotency_key`. Duplicate keys return the existing ledger row atomically, preventing double-spend on retries |
| SQL functions for credit atomicity | `consume_credits` uses `SELECT FOR UPDATE` to lock the balance row, preventing race conditions between concurrent requests |
| RLS on all tables | Every table has RLS enabled. Clients can only see their own org's data. Service role bypasses RLS for webhook/admin operations |
| Status transition validation | `STATUS_TRANSITIONS` map defines allowed next statuses. Service layer validates before any DB write. Role-based guards prevent clients from jumping to admin-only statuses |
