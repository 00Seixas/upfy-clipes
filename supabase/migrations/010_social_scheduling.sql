-- ─── connected_platforms ──────────────────────────────────────────────────────
-- SECURITY NOTE: OAuth tokens are AES-256-GCM encrypted at the application layer.
-- The app never returns token fields to the client.
CREATE TABLE public.connected_platforms (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform                 text NOT NULL CHECK (platform IN ('youtube','instagram','tiktok')),
  platform_user_id         text,
  platform_username        text,
  -- Encrypted OAuth tokens (app-layer encrypted)
  access_token_encrypted   text,
  refresh_token_encrypted  text,
  token_expires_at         timestamptz,
  scopes                   text[] NOT NULL DEFAULT '{}',
  is_connected             boolean NOT NULL DEFAULT true,
  last_used_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, platform)
);

CREATE INDEX idx_connected_platforms_org ON public.connected_platforms(organization_id);
CREATE INDEX idx_connected_platforms_platform ON public.connected_platforms(platform);

CREATE OR REPLACE TRIGGER trg_connected_platforms_updated_at
  BEFORE UPDATE ON public.connected_platforms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── scheduled_posts ──────────────────────────────────────────────────────────
CREATE TABLE public.scheduled_posts (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  delivered_clip_id     uuid NOT NULL REFERENCES public.delivered_clips(id) ON DELETE CASCADE,
  connected_platform_id uuid NOT NULL REFERENCES public.connected_platforms(id) ON DELETE RESTRICT,
  platform              text NOT NULL CHECK (platform IN ('youtube','instagram','tiktok')),
  status                text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','publishing','published','failed','canceled')),
  scheduled_for         timestamptz NOT NULL,
  caption               text,
  hashtags              text[] NOT NULL DEFAULT '{}',
  platform_post_id      text,
  published_at          timestamptz,
  error_message         text,
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_org ON public.scheduled_posts(organization_id);
CREATE INDEX idx_scheduled_posts_clip ON public.scheduled_posts(delivered_clip_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled ON public.scheduled_posts(scheduled_for);

CREATE OR REPLACE TRIGGER trg_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── performance_metrics ──────────────────────────────────────────────────────
CREATE TABLE public.performance_metrics (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  delivered_clip_id uuid REFERENCES public.delivered_clips(id) ON DELETE CASCADE,
  scheduled_post_id uuid REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  platform          text NOT NULL CHECK (platform IN ('youtube','instagram','tiktok')),
  platform_post_id  text,
  views             bigint,
  likes             bigint,
  comments          bigint,
  shares            bigint,
  saves             bigint,
  reach             bigint,
  impressions       bigint,
  recorded_at       timestamptz NOT NULL DEFAULT NOW(),
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perf_metrics_org ON public.performance_metrics(organization_id);
CREATE INDEX idx_perf_metrics_clip ON public.performance_metrics(delivered_clip_id);
CREATE INDEX idx_perf_metrics_recorded ON public.performance_metrics(recorded_at DESC);
