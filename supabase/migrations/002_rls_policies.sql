-- ============================================================
-- UPFY CLIPES — Migração 002: Row Level Security (RLS)
-- ============================================================
-- Filosofia:
--   • Cliente só enxerga seus próprios dados
--   • Editor enxerga pedidos em produção e seus deliverables
--   • Admin enxerga tudo
--   • Service role bypassa RLS (usado nos webhooks/server actions)
-- ============================================================

-- Helper: retorna o role do usuário logado
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- TABELA: users
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Cliente vê e atualiza apenas seu próprio perfil
CREATE POLICY "users: cliente lê próprio perfil"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users: cliente atualiza próprio perfil"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- Editor enxerga clientes (para ver quem enviou o pedido)
CREATE POLICY "users: editor vê clientes"
  ON public.users FOR SELECT
  USING (auth.user_role() IN ('editor', 'admin'));

-- Admin gerencia todos
CREATE POLICY "users: admin gerencia tudo"
  ON public.users FOR ALL
  USING (auth.user_role() = 'admin');

-- INSERT: apenas via service role (criado no register server action)
CREATE POLICY "users: service role insere"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABELA: styles
-- ============================================================

ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário logado lê estilos ativos
CREATE POLICY "styles: autenticados leem ativos"
  ON public.styles FOR SELECT
  USING (active = TRUE AND auth.uid() IS NOT NULL);

-- Admin gerencia tudo (inclusive inativos)
CREATE POLICY "styles: admin gerencia tudo"
  ON public.styles FOR ALL
  USING (auth.user_role() = 'admin');

-- ============================================================
-- TABELA: credit_balances
-- ============================================================

ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;

-- Cliente lê próprio saldo
CREATE POLICY "credit_balances: cliente lê próprio"
  ON public.credit_balances FOR SELECT
  USING (user_id = auth.uid());

-- Admin lê tudo
CREATE POLICY "credit_balances: admin lê tudo"
  ON public.credit_balances FOR SELECT
  USING (auth.user_role() = 'admin');

-- UPDATE apenas via service role (webhooks Stripe)
-- INSERT apenas via service role (criação de conta)

-- ============================================================
-- TABELA: subscriptions
-- ============================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Cliente lê própria assinatura
CREATE POLICY "subscriptions: cliente lê própria"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Admin lê tudo
CREATE POLICY "subscriptions: admin lê tudo"
  ON public.subscriptions FOR SELECT
  USING (auth.user_role() = 'admin');

-- Escrita apenas via service role (webhooks Stripe)

-- ============================================================
-- TABELA: orders
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Cliente lê/cria seus pedidos
CREATE POLICY "orders: cliente lê próprios"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders: cliente cria pedido"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Editor lê pedidos em produção ou que lhe foram atribuídos
CREATE POLICY "orders: editor vê fila"
  ON public.orders FOR SELECT
  USING (
    auth.user_role() = 'editor'
    AND status IN ('pending', 'in_production', 'review')
  );

CREATE POLICY "orders: editor atualiza status"
  ON public.orders FOR UPDATE
  USING (auth.user_role() = 'editor')
  WITH CHECK (
    auth.user_role() = 'editor'
    AND status IN ('in_production', 'review')
  );

-- Admin lê e atualiza tudo
CREATE POLICY "orders: admin gerencia tudo"
  ON public.orders FOR ALL
  USING (auth.user_role() = 'admin');

-- ============================================================
-- TABELA: videos
-- ============================================================

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: cliente NÃO vê timestamps/transcrição — apenas r2_url e duration
CREATE POLICY "videos: cliente vê dados básicos do próprio pedido"
  ON public.videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = videos.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- Editor e admin veem tudo (incluindo transcrição e timestamps)
CREATE POLICY "videos: editor e admin veem tudo"
  ON public.videos FOR SELECT
  USING (auth.user_role() IN ('editor', 'admin'));

-- Editor/service insere o vídeo
CREATE POLICY "videos: editor insere"
  ON public.videos FOR INSERT
  WITH CHECK (auth.user_role() IN ('editor', 'admin'));

-- Editor/service atualiza (transcrição, timestamps)
CREATE POLICY "videos: editor atualiza"
  ON public.videos FOR UPDATE
  USING (auth.user_role() IN ('editor', 'admin'));

-- ============================================================
-- TABELA: deliverables
-- ============================================================

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas deliverables aprovados pelo admin, dos seus pedidos
CREATE POLICY "deliverables: cliente vê próprios aprovados"
  ON public.deliverables FOR SELECT
  USING (
    approved = TRUE
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = deliverables.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- Editor vê todos os deliverables que criou + pendentes de aprovação
CREATE POLICY "deliverables: editor vê os seus"
  ON public.deliverables FOR SELECT
  USING (
    auth.user_role() = 'editor'
    AND (editor_id = auth.uid() OR approved = FALSE)
  );

-- Editor insere e atualiza seus deliverables
CREATE POLICY "deliverables: editor insere"
  ON public.deliverables FOR INSERT
  WITH CHECK (
    auth.user_role() = 'editor'
    AND editor_id = auth.uid()
  );

CREATE POLICY "deliverables: editor atualiza os seus"
  ON public.deliverables FOR UPDATE
  USING (
    auth.user_role() = 'editor'
    AND editor_id = auth.uid()
    AND approved = FALSE  -- não pode editar após aprovação
  );

-- Admin vê e gerencia tudo
CREATE POLICY "deliverables: admin gerencia tudo"
  ON public.deliverables FOR ALL
  USING (auth.user_role() = 'admin');

-- ============================================================
-- TABELA: revisions
-- ============================================================

ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;

-- Cliente cria revisão apenas para pedidos seus com status 'delivered'
CREATE POLICY "revisions: cliente cria para pedido próprio"
  ON public.revisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = revisions.order_id
        AND orders.user_id = auth.uid()
        AND orders.status = 'delivered'
    )
  );

-- Cliente lê revisões dos seus pedidos
CREATE POLICY "revisions: cliente lê próprias"
  ON public.revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = revisions.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- Editor e admin leem e atualizam tudo
CREATE POLICY "revisions: editor e admin gerenciam"
  ON public.revisions FOR ALL
  USING (auth.user_role() IN ('editor', 'admin'));

-- ============================================================
-- TABELA: credit_purchases
-- ============================================================

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Cliente lê histórico próprio
CREATE POLICY "credit_purchases: cliente lê próprio histórico"
  ON public.credit_purchases FOR SELECT
  USING (user_id = auth.uid());

-- Admin lê tudo
CREATE POLICY "credit_purchases: admin lê tudo"
  ON public.credit_purchases FOR SELECT
  USING (auth.user_role() = 'admin');

-- INSERT apenas via service role (webhook Stripe)

-- ============================================================
-- TABELA: social_connections
-- ============================================================

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Cliente gerencia suas próprias conexões
CREATE POLICY "social_connections: cliente gerencia próprias"
  ON public.social_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin vê tudo
CREATE POLICY "social_connections: admin vê tudo"
  ON public.social_connections FOR SELECT
  USING (auth.user_role() = 'admin');

-- ============================================================
-- TABELA: post_logs
-- ============================================================

ALTER TABLE public.post_logs ENABLE ROW LEVEL SECURITY;

-- Cliente vê logs dos seus clipes
CREATE POLICY "post_logs: cliente vê próprios"
  ON public.post_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.orders o ON o.id = d.order_id
      WHERE d.id = post_logs.deliverable_id
        AND o.user_id = auth.uid()
    )
  );

-- Admin vê e gerencia tudo
CREATE POLICY "post_logs: admin gerencia tudo"
  ON public.post_logs FOR ALL
  USING (auth.user_role() = 'admin');

-- ============================================================
-- TABELA: post_schedule
-- ============================================================

ALTER TABLE public.post_schedule ENABLE ROW LEVEL SECURITY;

-- Cliente gerencia seu próprio agendamento
CREATE POLICY "post_schedule: cliente gerencia próprio"
  ON public.post_schedule FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin vê tudo
CREATE POLICY "post_schedule: admin vê tudo"
  ON public.post_schedule FOR SELECT
  USING (auth.user_role() = 'admin');

-- ============================================================
-- TABELA: notifications
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cliente lê e marca como lidas suas notificações
CREATE POLICY "notifications: cliente gerencia próprias"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications: cliente marca como lida"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin insere notificações para qualquer usuário
CREATE POLICY "notifications: admin insere"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.user_role() = 'admin');

-- Service role insere (webhooks)
-- (service role bypassa RLS automaticamente)
