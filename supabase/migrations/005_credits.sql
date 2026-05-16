-- ─── credit_balances ──────────────────────────────────────────────────────────
CREATE TABLE public.credit_balances (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance         integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

-- ─── credit_ledger ────────────────────────────────────────────────────────────
CREATE TABLE public.credit_ledger (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount               integer NOT NULL CHECK (amount > 0),
  direction            text NOT NULL CHECK (direction IN ('credit','debit')),
  reason               text NOT NULL,
  related_entity_type  text,
  related_entity_id    uuid,
  idempotency_key      text,
  balance_after        integer NOT NULL CHECK (balance_after >= 0),
  note                 text,
  created_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT NOW()
);

-- Partial unique index: idempotency_key must be unique when not null
CREATE UNIQUE INDEX idx_credit_ledger_idempotency
  ON public.credit_ledger(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_credit_ledger_org_date ON public.credit_ledger(organization_id, created_at DESC);

-- ─── consume_credits (atomic, prevents overdraft) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_org_id          uuid,
  p_amount          integer,
  p_reason          text,
  p_related_type    text,
  p_related_id      uuid,
  p_idempotency_key text,
  p_created_by      uuid
) RETURNS public.credit_ledger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance_before integer;
  v_balance_after  integer;
  v_ledger         public.credit_ledger;
  v_existing       public.credit_ledger;
BEGIN
  -- Idempotency check: if this key was already processed, return the existing record
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM public.credit_ledger
     WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- Lock the balance row to prevent race conditions
  SELECT balance INTO v_balance_before
    FROM public.credit_balances
   WHERE organization_id = p_org_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization credit balance not found: %', p_org_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: have %, need %', v_balance_before, p_amount
      USING ERRCODE = 'P0001';
  END IF;

  v_balance_after := v_balance_before - p_amount;

  UPDATE public.credit_balances
     SET balance    = v_balance_after,
         updated_at = NOW()
   WHERE organization_id = p_org_id;

  INSERT INTO public.credit_ledger
    (organization_id, amount, direction, reason, related_entity_type, related_entity_id,
     idempotency_key, balance_after, created_by)
  VALUES
    (p_org_id, p_amount, 'debit', p_reason, p_related_type, p_related_id,
     p_idempotency_key, v_balance_after, p_created_by)
  RETURNING * INTO v_ledger;

  RETURN v_ledger;
END;
$$;

-- ─── add_credits (atomic) ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_credits(
  p_org_id          uuid,
  p_amount          integer,
  p_reason          text,
  p_related_type    text,
  p_related_id      uuid,
  p_idempotency_key text,
  p_created_by      uuid,
  p_note            text
) RETURNS public.credit_ledger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance_before integer;
  v_balance_after  integer;
  v_ledger         public.credit_ledger;
  v_existing       public.credit_ledger;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM public.credit_ledger
     WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- Upsert balance row (in case it doesn't exist yet)
  INSERT INTO public.credit_balances (organization_id, balance)
  VALUES (p_org_id, 0)
  ON CONFLICT (organization_id) DO NOTHING;

  -- Lock the balance row
  SELECT balance INTO v_balance_before
    FROM public.credit_balances
   WHERE organization_id = p_org_id
     FOR UPDATE;

  v_balance_after := v_balance_before + p_amount;

  UPDATE public.credit_balances
     SET balance    = v_balance_after,
         updated_at = NOW()
   WHERE organization_id = p_org_id;

  INSERT INTO public.credit_ledger
    (organization_id, amount, direction, reason, related_entity_type, related_entity_id,
     idempotency_key, balance_after, note, created_by)
  VALUES
    (p_org_id, p_amount, 'credit', p_reason, p_related_type, p_related_id,
     p_idempotency_key, v_balance_after, p_note, p_created_by)
  RETURNING * INTO v_ledger;

  RETURN v_ledger;
END;
$$;
