-- ============================================================
-- UPFY CLIPES — Migração 006: Funções auxiliares de negócio
-- ============================================================

-- ============================================================
-- FUNÇÃO: deduct_credits
-- Debita créditos do saldo do cliente de forma atômica.
-- Lança exceção se saldo insuficiente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_order_id   UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- Lock da linha para evitar race condition
  SELECT credits_available
  INTO v_available
  FROM public.credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Saldo de créditos não encontrado para o usuário %', p_user_id;
  END IF;

  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Créditos insuficientes: disponível %, necessário %', v_available, p_amount
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.credit_balances
  SET
    credits_available = credits_available - p_amount,
    credits_used      = credits_used + p_amount,
    updated_at        = NOW()
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.deduct_credits IS
  'Debita créditos de forma atômica com lock. Lança exceção se insuficiente.';

-- ============================================================
-- FUNÇÃO: add_credits
-- Adiciona créditos ao saldo (compra avulsa ou renovação mensal).
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.credit_balances (user_id, credits_available, credits_used)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET
    credits_available = credit_balances.credits_available + EXCLUDED.credits_available,
    updated_at        = NOW();
END;
$$;

COMMENT ON FUNCTION public.add_credits IS
  'Adiciona créditos ao saldo — seguro para uso em webhooks Stripe.';

-- ============================================================
-- FUNÇÃO: get_dashboard_stats
-- Retorna métricas consolidadas para o dashboard do admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_clientes',       (SELECT COUNT(*) FROM public.users WHERE role = 'cliente'),
    'clientes_ativos',      (SELECT COUNT(DISTINCT user_id) FROM public.orders
                              WHERE created_at >= NOW() - INTERVAL '30 days'),
    'mrr_cents',            (SELECT COALESCE(SUM(
                              CASE s.credits_monthly
                                WHEN 20000 THEN 59700
                                WHEN 37500 THEN 99700
                                WHEN 75000 THEN 129700
                                ELSE 0
                              END
                            ), 0)
                            FROM public.subscriptions s
                            WHERE s.status IN ('active', 'trialing')),
    'clipes_entregues_mes', (SELECT COUNT(*) FROM public.orders
                              WHERE status = 'delivered'
                                AND updated_at >= DATE_TRUNC('month', NOW())),
    'pedidos_pendentes',    (SELECT COUNT(*) FROM public.orders WHERE status = 'pending'),
    'pedidos_em_producao',  (SELECT COUNT(*) FROM public.orders WHERE status = 'in_production'),
    'pedidos_em_revisao',   (SELECT COUNT(*) FROM public.orders WHERE status = 'review'),
    'creditos_consumidos_mes', (SELECT COALESCE(SUM(credits_cost), 0) FROM public.orders
                                 WHERE status = 'delivered'
                                   AND updated_at >= DATE_TRUNC('month', NOW())),
    'clipes_virais',        (SELECT COUNT(*) FROM public.deliverables WHERE virality_grade = 'viral'),
    'total_views',          (SELECT COALESCE(SUM(views), 0) FROM public.deliverables)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_stats IS
  'Retorna métricas consolidadas para o painel admin.';

-- ============================================================
-- FUNÇÃO: get_client_stats
-- Retorna métricas do cliente logado para o dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_client_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'credits_available',   cb.credits_available,
    'credits_used',        cb.credits_used,
    'orders_in_production', (
      SELECT COUNT(*) FROM public.orders
      WHERE user_id = p_user_id AND status IN ('pending','in_production','review')
    ),
    'orders_delivered',    (
      SELECT COUNT(*) FROM public.orders
      WHERE user_id = p_user_id AND status = 'delivered'
    ),
    'total_views',         (
      SELECT COALESCE(SUM(d.views), 0)
      FROM public.deliverables d
      JOIN public.orders o ON o.id = d.order_id
      WHERE o.user_id = p_user_id
    ),
    'viral_clips',         (
      SELECT COUNT(*)
      FROM public.deliverables d
      JOIN public.orders o ON o.id = d.order_id
      WHERE o.user_id = p_user_id AND d.virality_grade = 'viral'
    ),
    'views_this_month',    (
      SELECT COALESCE(SUM(d.views), 0)
      FROM public.deliverables d
      JOIN public.orders o ON o.id = d.order_id
      WHERE o.user_id = p_user_id
        AND d.created_at >= DATE_TRUNC('month', NOW())
    )
  )
  INTO v_result
  FROM public.credit_balances cb
  WHERE cb.user_id = p_user_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_client_stats IS
  'Retorna métricas consolidadas do cliente para o dashboard.';

-- ============================================================
-- FUNÇÃO: get_weekly_report_data
-- Gera os dados para o relatório semanal via WhatsApp.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_weekly_report_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
  v_week_start TIMESTAMPTZ := DATE_TRUNC('week', NOW()) - INTERVAL '7 days';
  v_week_end   TIMESTAMPTZ := DATE_TRUNC('week', NOW());
BEGIN
  SELECT jsonb_build_object(
    'clipes_postados', (
      SELECT COUNT(*)
      FROM public.post_logs pl
      WHERE pl.posted_at BETWEEN v_week_start AND v_week_end
        AND pl.status = 'posted'
        AND EXISTS (
          SELECT 1 FROM public.deliverables d
          JOIN public.orders o ON o.id = d.order_id
          WHERE d.id = pl.deliverable_id AND o.user_id = p_user_id
        )
    ),
    'views_semana', (
      SELECT COALESCE(SUM(d.views), 0)
      FROM public.deliverables d
      JOIN public.orders o ON o.id = d.order_id
      WHERE o.user_id = p_user_id
        AND d.created_at BETWEEN v_week_start AND v_week_end
    ),
    'virais_semana', (
      SELECT COUNT(*)
      FROM public.deliverables d
      JOIN public.orders o ON o.id = d.order_id
      WHERE o.user_id = p_user_id
        AND d.virality_grade = 'viral'
        AND d.created_at BETWEEN v_week_start AND v_week_end
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_weekly_report_data IS
  'Dados para o relatório semanal enviado via WhatsApp todo domingo.';

-- ============================================================
-- REALTIME: habilitar publicação para tabelas que precisam
--           de updates em tempo real no cliente
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;
