-- ─── notifications ────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'app'
                  CHECK (channel IN ('app','email','whatsapp')),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','failed','read')),
  title           text NOT NULL,
  body            text NOT NULL,
  action_url      text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  sent_at         timestamptz,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role      text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       text NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}',
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ─── webhook_events ───────────────────────────────────────────────────────────
CREATE TABLE public.webhook_events (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider       text NOT NULL CHECK (provider IN ('stripe','youtube','instagram','tiktok','other')),
  event_id       text NOT NULL,
  event_type     text NOT NULL,
  status         text NOT NULL DEFAULT 'received'
                 CHECK (status IN ('received','processed','failed','ignored')),
  payload        jsonb NOT NULL DEFAULT '{}',
  error_message  text,
  processed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_webhook_events_provider ON public.webhook_events(provider);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_created ON public.webhook_events(created_at DESC);
