-- ─── editing_styles ───────────────────────────────────────────────────────────
CREATE TABLE public.editing_styles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  description text,
  preview_url text,
  tags        text[] NOT NULL DEFAULT '{}',
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_editing_styles_updated_at
  BEFORE UPDATE ON public.editing_styles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add FK from organizations to editing_styles now that the table exists
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_org_editing_style
  FOREIGN KEY (default_editing_style_id)
  REFERENCES public.editing_styles(id)
  ON DELETE SET NULL;

-- ─── monthly_plans ────────────────────────────────────────────────────────────
CREATE TABLE public.monthly_plans (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  price_cents      integer NOT NULL CHECK (price_cents >= 0),
  currency         text NOT NULL DEFAULT 'BRL',
  videos_per_day   integer,
  videos_per_month integer NOT NULL,
  stripe_price_id  text UNIQUE,
  is_active        boolean NOT NULL DEFAULT true,
  features         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_monthly_plans_updated_at
  BEFORE UPDATE ON public.monthly_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  plan_id                  text NOT NULL REFERENCES public.monthly_plans(id),
  stripe_subscription_id   text UNIQUE,
  stripe_customer_id       text,
  status                   text NOT NULL DEFAULT 'active'
                           CHECK (status IN (
                             'active','trialing','past_due','canceled',
                             'unpaid','incomplete','incomplete_expired',
                             'paused','manual_active','manual_canceled'
                           )),
  source                   text NOT NULL DEFAULT 'stripe'
                           CHECK (source IN ('stripe','manual','offline')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  canceled_at              timestamptz,
  trial_end                timestamptz,
  metadata                 jsonb NOT NULL DEFAULT '{}',
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── usage_periods ────────────────────────────────────────────────────────────
CREATE TABLE public.usage_periods (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  plan_id         text NOT NULL REFERENCES public.monthly_plans(id),
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  included_clips  integer NOT NULL CHECK (included_clips > 0),
  used_clips      integer NOT NULL DEFAULT 0 CHECK (used_clips >= 0),
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','exhausted','expired')),
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_periods_org_status ON public.usage_periods(organization_id, status);
CREATE INDEX idx_usage_periods_sub ON public.usage_periods(subscription_id);

CREATE OR REPLACE TRIGGER trg_usage_periods_updated_at
  BEFORE UPDATE ON public.usage_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
