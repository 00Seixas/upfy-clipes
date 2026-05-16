-- ─── assets ───────────────────────────────────────────────────────────────────
-- object_key is the internal R2 path — NEVER returned to clients via API.
-- Signed URLs are generated on-demand by the app layer.
CREATE TABLE public.assets (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clip_request_id uuid,
  uploaded_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind            text NOT NULL CHECK (kind IN ('raw_video','final_clip','thumbnail','transcript','preview','other')),
  object_key      text NOT NULL, -- internal R2 key, server-only
  file_name       text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      bigint CHECK (size_bytes > 0),
  status          text NOT NULL DEFAULT 'uploading'
                  CHECK (status IN ('uploading','ready','failed','deleted')),
  checksum        text,
  duration_seconds numeric(10,2),
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_org ON public.assets(organization_id);
CREATE INDEX idx_assets_clip_request ON public.assets(clip_request_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_kind ON public.assets(kind);

CREATE OR REPLACE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
