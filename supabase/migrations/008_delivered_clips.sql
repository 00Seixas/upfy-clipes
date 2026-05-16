-- ─── delivered_clips ──────────────────────────────────────────────────────────
CREATE TABLE public.delivered_clips (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_request_id     uuid NOT NULL REFERENCES public.clip_requests(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  final_asset_id      uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  thumbnail_asset_id  uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  title               text,
  description         text,
  viral_score         integer CHECK (viral_score >= 0 AND viral_score <= 100),
  viral_grade         text CHECK (viral_grade IN ('frio','morno','quente','viral')),
  status              text NOT NULL DEFAULT 'internal_review'
                      CHECK (status IN (
                        'internal_review','ready_for_client','revision_requested',
                        'approved','published','archived'
                      )),
  revision_count      integer NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
  max_revisions       integer NOT NULL DEFAULT 1 CHECK (max_revisions >= 0),
  revision_deadline   timestamptz,
  approved_at         timestamptz,
  published_at        timestamptz,
  editor_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  editor_notes        text,
  admin_notes         text,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivered_clips_org ON public.delivered_clips(organization_id);
CREATE INDEX idx_delivered_clips_request ON public.delivered_clips(clip_request_id);
CREATE INDEX idx_delivered_clips_status ON public.delivered_clips(status);
CREATE INDEX idx_delivered_clips_created ON public.delivered_clips(created_at DESC);

CREATE OR REPLACE TRIGGER trg_delivered_clips_updated_at
  BEFORE UPDATE ON public.delivered_clips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── clip_revisions ───────────────────────────────────────────────────────────
CREATE TABLE public.clip_revisions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivered_clip_id uuid NOT NULL REFERENCES public.delivered_clips(id) ON DELETE CASCADE,
  requested_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status            text NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested','in_progress','resolved','rejected')),
  message           text NOT NULL,
  editor_response   text,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clip_revisions_clip ON public.clip_revisions(delivered_clip_id);
CREATE INDEX idx_clip_revisions_status ON public.clip_revisions(status);

CREATE OR REPLACE TRIGGER trg_clip_revisions_updated_at
  BEFORE UPDATE ON public.clip_revisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
