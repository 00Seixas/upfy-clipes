-- ─── 014: Enterprise System — Editor Wallets, Scores, Payouts, Operational Logs ───

-- ─── Extend orders table with enterprise fields ──────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority       text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS is_urgent      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_vip         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS difficulty     text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS clips_requested integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paused_at      timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours      integer NOT NULL DEFAULT 48;

-- Expand orders status constraint to include enterprise statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'aguardando','em_analise','na_fila','atribuido','em_edicao',
    'revisao_interna','pronto','revisao_solicitada','aprovacao',
    'entregue','publicado','cancelado','falhou','pausado'
  ));

-- Add priority and difficulty constraints
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_priority_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_priority_check
  CHECK (priority IN ('low','normal','high','critical'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_difficulty_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_difficulty_check
  CHECK (difficulty IN ('easy','medium','hard','expert'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_clips_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_clips_check
  CHECK (clips_requested > 0);

-- ─── editor_wallets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.editor_wallets (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id                 uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_available_cents   integer NOT NULL DEFAULT 0 CHECK (balance_available_cents >= 0),
  balance_pending_cents     integer NOT NULL DEFAULT 0 CHECK (balance_pending_cents >= 0),
  balance_processing_cents  integer NOT NULL DEFAULT 0 CHECK (balance_processing_cents >= 0),
  total_earned_cents        integer NOT NULL DEFAULT 0 CHECK (total_earned_cents >= 0),
  created_at                timestamptz NOT NULL DEFAULT NOW(),
  updated_at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_wallets_editor ON public.editor_wallets(editor_id);

DROP TRIGGER IF EXISTS trg_editor_wallets_updated_at ON public.editor_wallets;
CREATE TRIGGER trg_editor_wallets_updated_at
  BEFORE UPDATE ON public.editor_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── editor_earnings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.editor_earnings (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gross_cents  integer NOT NULL CHECK (gross_cents > 0),
  fee_cents    integer NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  net_cents    integer NOT NULL CHECK (net_cents > 0),
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','available','processing','paid','reversed')),
  description  text,
  paid_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(editor_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_editor_earnings_editor ON public.editor_earnings(editor_id);
CREATE INDEX IF NOT EXISTS idx_editor_earnings_order  ON public.editor_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_editor_earnings_status ON public.editor_earnings(status);

-- ─── editor_payout_requests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.editor_payout_requests (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_requested_cents integer NOT NULL CHECK (amount_requested_cents > 0),
  fee_cents              integer NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  amount_net_cents       integer NOT NULL CHECK (amount_net_cents > 0),
  status                 text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','processing','paid','rejected')),
  pix_key                text,
  pix_key_type           text CHECK (pix_key_type IN ('cpf','cnpj','email','phone','random')),
  admin_notes            text,
  approved_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at            timestamptz,
  paid_at                timestamptz,
  rejected_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT NOW(),
  updated_at             timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_payouts_editor  ON public.editor_payout_requests(editor_id);
CREATE INDEX IF NOT EXISTS idx_editor_payouts_status  ON public.editor_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_editor_payouts_created ON public.editor_payout_requests(created_at DESC);

DROP TRIGGER IF EXISTS trg_editor_payout_updated_at ON public.editor_payout_requests;
CREATE TRIGGER trg_editor_payout_updated_at
  BEFORE UPDATE ON public.editor_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── editor_scores ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.editor_scores (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id                uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_quality            integer NOT NULL DEFAULT 100 CHECK (score_quality BETWEEN 0 AND 100),
  score_speed              integer NOT NULL DEFAULT 100 CHECK (score_speed BETWEEN 0 AND 100),
  score_consistency        integer NOT NULL DEFAULT 100 CHECK (score_consistency BETWEEN 0 AND 100),
  total_completed          integer NOT NULL DEFAULT 0 CHECK (total_completed >= 0),
  total_late               integer NOT NULL DEFAULT 0 CHECK (total_late >= 0),
  total_revisions_received integer NOT NULL DEFAULT 0 CHECK (total_revisions_received >= 0),
  avg_delivery_hours       numeric(10,2),
  last_active_at           timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_scores_editor ON public.editor_scores(editor_id);

DROP TRIGGER IF EXISTS trg_editor_scores_updated_at ON public.editor_scores;
CREATE TRIGGER trg_editor_scores_updated_at
  BEFORE UPDATE ON public.editor_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── workload_snapshots ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workload_snapshots (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  active_orders    integer NOT NULL DEFAULT 0 CHECK (active_orders >= 0),
  difficulty_score integer NOT NULL DEFAULT 0 CHECK (difficulty_score >= 0),
  category         text NOT NULL DEFAULT 'light'
                   CHECK (category IN ('light','moderate','heavy','critical')),
  recorded_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workload_editor_time ON public.workload_snapshots(editor_id, recorded_at DESC);

-- ─── operational_settings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operational_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- ─── operational_logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operational_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name  text,
  actor_role  text,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  before_data jsonb,
  after_data  jsonb,
  metadata    jsonb NOT NULL DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oplogs_actor   ON public.operational_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oplogs_entity  ON public.operational_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_oplogs_action  ON public.operational_logs(action);
CREATE INDEX IF NOT EXISTS idx_oplogs_created ON public.operational_logs(created_at DESC);

-- ─── Default operational settings ────────────────────────────────────────────
INSERT INTO public.operational_settings (key, value, description) VALUES
  ('payout_value_per_clip_cents',      '1000', 'Valor em centavos por clipe aprovado (R$10,00)'),
  ('payout_withdrawal_fee_cents',      '499',  'Taxa fixa de saque em centavos (R$4,99)'),
  ('payout_minimum_withdrawal_cents',  '2000', 'Valor mínimo para saque em centavos (R$20,00)'),
  ('editor_max_active_orders',         '5',    'Máximo de pedidos ativos por editor'),
  ('sla_default_hours',                '48',   'SLA padrão em horas')
ON CONFLICT (key) DO NOTHING;
