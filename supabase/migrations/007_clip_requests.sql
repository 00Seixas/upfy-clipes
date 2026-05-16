-- ─── clip_requests ────────────────────────────────────────────────────────────
CREATE TABLE public.clip_requests (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  created_by               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_editor_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type                     text NOT NULL
                           CHECK (type IN ('short_video','long_video','recorded_video','youtube_video')),
  status                   text NOT NULL DEFAULT 'draft'
                           CHECK (status IN (
                             'draft','pending_payment','pending_analysis','queued','assigned',
                             'editing','internal_review','changes_requested_by_admin',
                             'ready_for_client','revision_requested','approved','delivered',
                             'published','canceled','failed'
                           )),
  billing_mode             text NOT NULL DEFAULT 'credits'
                           CHECK (billing_mode IN ('credits','monthly_quota','manual_free','admin_override')),
  credits_charged          integer CHECK (credits_charged >= 0),
  monthly_quota_charged    integer CHECK (monthly_quota_charged >= 0),
  title                    text,
  description              text,
  raw_video_url            text,
  youtube_video_id         text,
  youtube_video_url        text,
  clips_requested          integer NOT NULL DEFAULT 1 CHECK (clips_requested > 0),
  editing_style_id         uuid REFERENCES public.editing_styles(id) ON DELETE SET NULL,
  cta_type                 text NOT NULL DEFAULT 'default'
                           CHECK (cta_type IN ('none','default','custom','upfy_suggests')),
  cta_text                 text,
  editor_notes             text,
  client_notes             text,
  related_opportunity_id   uuid,
  related_video_ranking_id uuid,
  submitted_at             timestamptz,
  assigned_at              timestamptz,
  editing_started_at       timestamptz,
  delivered_at             timestamptz,
  approved_at              timestamptz,
  canceled_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW(),

  -- Composite unique for RLS policy joins
  UNIQUE (id, organization_id)
);

CREATE INDEX idx_clip_requests_org_status ON public.clip_requests(organization_id, status);
CREATE INDEX idx_clip_requests_editor ON public.clip_requests(assigned_editor_id);
CREATE INDEX idx_clip_requests_created ON public.clip_requests(created_at DESC);
CREATE INDEX idx_clip_requests_status ON public.clip_requests(status);

CREATE OR REPLACE TRIGGER trg_clip_requests_updated_at
  BEFORE UPDATE ON public.clip_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add FK from assets back to clip_requests (clip_requests created first)
ALTER TABLE public.assets
  ADD CONSTRAINT fk_assets_clip_request
  FOREIGN KEY (clip_request_id)
  REFERENCES public.clip_requests(id)
  ON DELETE SET NULL;

-- ─── clip_request_events ──────────────────────────────────────────────────────
CREATE TABLE public.clip_request_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_request_id uuid NOT NULL REFERENCES public.clip_requests(id) ON DELETE CASCADE,
  actor_user_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_status     text CHECK (from_status IN (
    'draft','pending_payment','pending_analysis','queued','assigned',
    'editing','internal_review','changes_requested_by_admin',
    'ready_for_client','revision_requested','approved','delivered',
    'published','canceled','failed'
  )),
  to_status       text NOT NULL CHECK (to_status IN (
    'draft','pending_payment','pending_analysis','queued','assigned',
    'editing','internal_review','changes_requested_by_admin',
    'ready_for_client','revision_requested','approved','delivered',
    'published','canceled','failed'
  )),
  message         text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clip_events_request ON public.clip_request_events(clip_request_id);
CREATE INDEX idx_clip_events_created ON public.clip_request_events(created_at DESC);
