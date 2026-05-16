-- ─── Helper: updated_at trigger function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text NOT NULL,
  phone       text,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'client'
              CHECK (role IN ('client','editor','admin','super_admin')),
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','inactive','banned')),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Auto-create profile on sign-up ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── organizations ────────────────────────────────────────────────────────────
CREATE TABLE public.organizations (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     text NOT NULL,
  slug                     text NOT NULL UNIQUE,
  owner_user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  type                     text NOT NULL DEFAULT 'client'
                           CHECK (type IN ('client','internal')),
  status                   text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','suspended','churned')),
  default_cta              text NOT NULL DEFAULT 'default'
                           CHECK (default_cta IN ('none','default','custom','upfy_suggests')),
  default_editing_style_id uuid,
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_owner ON public.organizations(owner_user_id);

CREATE OR REPLACE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── organization_members ─────────────────────────────────────────────────────
CREATE TABLE public.organization_members (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner','member','viewer')),
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
