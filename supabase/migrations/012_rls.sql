-- ─── Enable RLS on all tables ─────────────────────────────────────────────────
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_styles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_periods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_request_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivered_clips       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_revisions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_channels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views_vault_analyses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_potential_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_clip_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_platforms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events        ENABLE ROW LEVEL SECURITY;

-- ─── Helper functions ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.current_user_role() IN ('admin','super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.current_user_role() = 'super_admin'
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.current_user_role() IN ('editor','admin','super_admin')
$$;

CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.organizations WHERE owner_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  )
$$;

-- ─── profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_service"
  ON public.profiles FOR INSERT
  WITH CHECK (true); -- handled by trigger with SECURITY DEFINER

-- ─── organizations ────────────────────────────────────────────────────────────
CREATE POLICY "orgs_select"
  ON public.organizations FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR public.is_org_member(id)
    OR public.is_admin()
  );

CREATE POLICY "orgs_update"
  ON public.organizations FOR UPDATE
  USING (owner_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "orgs_insert"
  ON public.organizations FOR INSERT
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

-- ─── organization_members ─────────────────────────────────────────────────────
CREATE POLICY "org_members_select"
  ON public.organization_members FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR public.is_admin()
  );

CREATE POLICY "org_members_insert_admin"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "org_members_delete_admin"
  ON public.organization_members FOR DELETE
  USING (public.is_admin());

-- ─── editing_styles ───────────────────────────────────────────────────────────
CREATE POLICY "editing_styles_select_all"
  ON public.editing_styles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "editing_styles_write_admin"
  ON public.editing_styles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── monthly_plans ────────────────────────────────────────────────────────────
CREATE POLICY "monthly_plans_select_authenticated"
  ON public.monthly_plans FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "monthly_plans_all_admin"
  ON public.monthly_plans FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── subscriptions ────────────────────────────────────────────────────────────
CREATE POLICY "subscriptions_select"
  ON public.subscriptions FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- Writes only via service_role (webhook handler)
-- No INSERT/UPDATE policies means only service_role (which bypasses RLS) can write

-- ─── usage_periods ────────────────────────────────────────────────────────────
CREATE POLICY "usage_periods_select"
  ON public.usage_periods FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── credit_balances ──────────────────────────────────────────────────────────
CREATE POLICY "credit_balances_select"
  ON public.credit_balances FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── credit_ledger ────────────────────────────────────────────────────────────
CREATE POLICY "credit_ledger_select"
  ON public.credit_ledger FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── assets ───────────────────────────────────────────────────────────────────
CREATE POLICY "assets_select"
  ON public.assets FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR (
      public.is_editor() AND EXISTS (
        SELECT 1 FROM public.clip_requests cr
        WHERE cr.id = assets.clip_request_id
          AND cr.assigned_editor_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "assets_insert_org_member"
  ON public.assets FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- Updates only via service_role (upload completion)

-- ─── clip_requests ────────────────────────────────────────────────────────────
CREATE POLICY "clip_requests_select_client"
  ON public.clip_requests FOR SELECT
  USING (
    -- Client can see their own org's requests
    (
      public.current_user_role() = 'client'
      AND (
        organization_id = public.user_organization_id()
        OR public.is_org_member(organization_id)
      )
    )
    -- Editors can see requests assigned to them OR queued requests
    OR (
      public.is_editor()
      AND (assigned_editor_id = auth.uid() OR status = 'queued')
    )
    -- Admins see everything
    OR public.is_admin()
  );

CREATE POLICY "clip_requests_insert_client"
  ON public.clip_requests FOR INSERT
  WITH CHECK (
    (
      public.current_user_role() = 'client'
      AND (
        organization_id = public.user_organization_id()
        OR public.is_org_member(organization_id)
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "clip_requests_update"
  ON public.clip_requests FOR UPDATE
  USING (
    (
      public.current_user_role() = 'client'
      AND (
        organization_id = public.user_organization_id()
        OR public.is_org_member(organization_id)
      )
      AND status IN ('draft')
    )
    OR (public.is_editor() AND assigned_editor_id = auth.uid())
    OR public.is_admin()
  );

-- ─── clip_request_events ─────────────────────────────────────────────────────
CREATE POLICY "clip_events_select"
  ON public.clip_request_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clip_requests cr
      WHERE cr.id = clip_request_id
        AND (
          cr.organization_id = public.user_organization_id()
          OR public.is_org_member(cr.organization_id)
          OR (public.is_editor() AND (cr.assigned_editor_id = auth.uid() OR cr.status = 'queued'))
          OR public.is_admin()
        )
    )
  );

-- Inserts only via service_role

-- ─── delivered_clips ──────────────────────────────────────────────────────────
CREATE POLICY "delivered_clips_select"
  ON public.delivered_clips FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_editor()
    OR public.is_admin()
  );

CREATE POLICY "delivered_clips_update_admin"
  ON public.delivered_clips FOR UPDATE
  USING (public.is_admin() OR public.is_editor());

-- ─── clip_revisions ───────────────────────────────────────────────────────────
CREATE POLICY "clip_revisions_select"
  ON public.clip_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivered_clips dc
      WHERE dc.id = delivered_clip_id
        AND (
          dc.organization_id = public.user_organization_id()
          OR public.is_org_member(dc.organization_id)
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "clip_revisions_insert_client"
  ON public.clip_revisions FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.delivered_clips dc
      WHERE dc.id = delivered_clip_id
        AND (
          dc.organization_id = public.user_organization_id()
          OR public.is_org_member(dc.organization_id)
        )
    )
  );

CREATE POLICY "clip_revisions_update_editor_admin"
  ON public.clip_revisions FOR UPDATE
  USING (public.is_editor() OR public.is_admin());

-- ─── youtube_channels ─────────────────────────────────────────────────────────
-- Tokens are always stripped in app layer before returning to client
CREATE POLICY "youtube_channels_select"
  ON public.youtube_channels FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "youtube_channels_insert"
  ON public.youtube_channels FOR INSERT
  WITH CHECK (
    organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "youtube_channels_update"
  ON public.youtube_channels FOR UPDATE
  USING (
    organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "youtube_channels_delete"
  ON public.youtube_channels FOR DELETE
  USING (
    organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── youtube_videos ───────────────────────────────────────────────────────────
CREATE POLICY "youtube_videos_select"
  ON public.youtube_videos FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- Inserts/updates via service_role only

-- ─── views_vault_analyses ─────────────────────────────────────────────────────
CREATE POLICY "vv_analyses_select"
  ON public.views_vault_analyses FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── video_potential_rankings ─────────────────────────────────────────────────
CREATE POLICY "vpr_select"
  ON public.video_potential_rankings FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── found_clip_opportunities ─────────────────────────────────────────────────
CREATE POLICY "fco_select"
  ON public.found_clip_opportunities FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "fco_update_org_or_admin"
  ON public.found_clip_opportunities FOR UPDATE
  USING (
    organization_id = public.user_organization_id()
    OR public.is_org_member(organization_id)
    OR public.is_admin()
  );

-- ─── connected_platforms ──────────────────────────────────────────────────────
CREATE POLICY "connected_platforms_select"
  ON public.connected_platforms FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "connected_platforms_insert"
  ON public.connected_platforms FOR INSERT
  WITH CHECK (
    organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "connected_platforms_update"
  ON public.connected_platforms FOR UPDATE
  USING (
    organization_id = public.user_organization_id()
    OR public.is_org_member(organization_id)
    OR public.is_admin()
  );

CREATE POLICY "connected_platforms_delete"
  ON public.connected_platforms FOR DELETE
  USING (
    organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── scheduled_posts ──────────────────────────────────────────────────────────
CREATE POLICY "scheduled_posts_select"
  ON public.scheduled_posts FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "scheduled_posts_insert"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (
    organization_id = public.user_organization_id()
    OR public.is_admin()
  );

CREATE POLICY "scheduled_posts_update"
  ON public.scheduled_posts FOR UPDATE
  USING (
    organization_id = public.user_organization_id()
    OR public.is_org_member(organization_id)
    OR public.is_admin()
  );

-- ─── performance_metrics ──────────────────────────────────────────────────────
CREATE POLICY "perf_metrics_select"
  ON public.performance_metrics FOR SELECT
  USING (
    public.is_org_member(organization_id)
    OR organization_id = public.user_organization_id()
    OR public.is_admin()
  );

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own_or_admin"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- ─── webhook_events ───────────────────────────────────────────────────────────
CREATE POLICY "webhook_events_select_admin"
  ON public.webhook_events FOR SELECT
  USING (public.is_admin());

-- Inserts/updates only via service_role
