-- ─── youtube_channels ─────────────────────────────────────────────────────────
-- SECURITY NOTE: OAuth tokens are encrypted at the application layer before storage.
-- The columns access_token_encrypted and refresh_token_encrypted hold AES-256-GCM
-- ciphertext (base64-encoded). The ENCRYPTION_KEY env var is used by the app for
-- encryption/decryption. Tokens are NEVER returned to the client via the API.
CREATE TABLE public.youtube_channels (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id               text NOT NULL,
  channel_name             text NOT NULL,
  channel_url              text,
  thumbnail_url            text,
  subscriber_count         bigint,
  video_count              integer,
  -- Encrypted OAuth tokens (AES-256-GCM, app-layer encrypted)
  access_token_encrypted   text,
  refresh_token_encrypted  text,
  token_expires_at         timestamptz,
  is_connected             boolean NOT NULL DEFAULT true,
  last_synced_at           timestamptz,
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, channel_id)
);

CREATE INDEX idx_youtube_channels_org ON public.youtube_channels(organization_id);

CREATE OR REPLACE TRIGGER trg_youtube_channels_updated_at
  BEFORE UPDATE ON public.youtube_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── youtube_videos ───────────────────────────────────────────────────────────
CREATE TABLE public.youtube_videos (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  youtube_channel_id  uuid NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  video_id            text NOT NULL,
  title               text NOT NULL,
  description         text,
  thumbnail_url       text,
  published_at        timestamptz,
  duration_seconds    integer,
  view_count          bigint,
  like_count          bigint,
  comment_count       bigint,
  tags                text[] NOT NULL DEFAULT '{}',
  fetched_at          timestamptz NOT NULL DEFAULT NOW(),
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (youtube_channel_id, video_id)
);

CREATE INDEX idx_youtube_videos_org ON public.youtube_videos(organization_id);
CREATE INDEX idx_youtube_videos_channel ON public.youtube_videos(youtube_channel_id);
CREATE INDEX idx_youtube_videos_views ON public.youtube_videos(view_count DESC);

-- ─── views_vault_analyses ─────────────────────────────────────────────────────
CREATE TABLE public.views_vault_analyses (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status               text NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued','processing','done','failed')),
  videos_analyzed      integer,
  total_potential_views bigint,
  clips_found          integer,
  top_viral_score      integer CHECK (top_viral_score >= 0 AND top_viral_score <= 100),
  disclaimer           text,
  methodology_version  text,
  error_message        text,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vv_analyses_org ON public.views_vault_analyses(organization_id);
CREATE INDEX idx_vv_analyses_status ON public.views_vault_analyses(status);
CREATE INDEX idx_vv_analyses_created ON public.views_vault_analyses(created_at DESC);

CREATE OR REPLACE TRIGGER trg_views_vault_analyses_updated_at
  BEFORE UPDATE ON public.views_vault_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── video_potential_rankings ─────────────────────────────────────────────────
CREATE TABLE public.video_potential_rankings (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id          uuid NOT NULL REFERENCES public.views_vault_analyses(id) ON DELETE CASCADE,
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  youtube_video_id     text NOT NULL,
  video_title          text NOT NULL,
  video_thumbnail_url  text,
  current_views        bigint,
  base_average_views   bigint,
  viral_score          integer NOT NULL CHECK (viral_score >= 0 AND viral_score <= 100),
  viral_grade          text NOT NULL CHECK (viral_grade IN ('frio','morno','quente','viral')),
  potential_views      bigint NOT NULL,
  clips_identified     integer NOT NULL DEFAULT 0,
  rank_position        integer NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vpr_analysis ON public.video_potential_rankings(analysis_id);
CREATE INDEX idx_vpr_org ON public.video_potential_rankings(organization_id);
CREATE INDEX idx_vpr_rank ON public.video_potential_rankings(analysis_id, rank_position);

-- ─── found_clip_opportunities ─────────────────────────────────────────────────
CREATE TABLE public.found_clip_opportunities (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id               uuid NOT NULL REFERENCES public.views_vault_analyses(id) ON DELETE CASCADE,
  video_ranking_id          uuid NOT NULL REFERENCES public.video_potential_rankings(id) ON DELETE CASCADE,
  organization_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  youtube_video_id          text NOT NULL,
  start_time_seconds        integer,
  end_time_seconds          integer,
  clip_title                text,
  clip_description          text,
  viral_score               integer NOT NULL CHECK (viral_score >= 0 AND viral_score <= 100),
  viral_grade               text NOT NULL CHECK (viral_grade IN ('frio','morno','quente','viral')),
  potential_views           bigint NOT NULL,
  status                    text NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available','requested','ignored')),
  related_clip_request_id   uuid REFERENCES public.clip_requests(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT NOW(),
  updated_at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fco_analysis ON public.found_clip_opportunities(analysis_id);
CREATE INDEX idx_fco_org ON public.found_clip_opportunities(organization_id);
CREATE INDEX idx_fco_ranking ON public.found_clip_opportunities(video_ranking_id);
CREATE INDEX idx_fco_status ON public.found_clip_opportunities(status);

CREATE OR REPLACE TRIGGER trg_found_clip_opp_updated_at
  BEFORE UPDATE ON public.found_clip_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
