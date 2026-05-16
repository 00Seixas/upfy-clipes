-- ─── Editing Styles ───────────────────────────────────────────────────────────
INSERT INTO public.editing_styles (id, name, description, tags, is_active, sort_order)
VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Dinâmico', 'Cortes rápidos, transições enérgicas, ideal para conteúdo de fitness e esportes', ARRAY['energia','rapido','transicoes'], true, 1),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Minimalista', 'Estilo limpo e clean, foco no conteúdo, sem distrações visuais', ARRAY['clean','simples','profissional'], true, 2),
  ('a1b2c3d4-0003-0000-0000-000000000003', 'Storytelling', 'Narrativa fluida, cortes suaves, perfeito para histórias e tutoriais longos', ARRAY['narrativa','suave','educativo'], true, 3),
  ('a1b2c3d4-0004-0000-0000-000000000004', 'Viral Hook', 'Hook nos primeiros 3 segundos, ritmo acelerado, otimizado para retenção', ARRAY['viral','hook','retencao'], true, 4),
  ('a1b2c3d4-0005-0000-0000-000000000005', 'Vlog Autêntico', 'Estilo casual e natural, sensação de espontaneidade, conexão com o público', ARRAY['casual','natural','autenticidade'], true, 5),
  ('a1b2c3d4-0006-0000-0000-000000000006', 'Educativo', 'Legenda com destaque em pontos-chave, ritmo didático, ideal para infoprodutores', ARRAY['educativo','didatico','legenda'], true, 6),
  ('a1b2c3d4-0007-0000-0000-000000000007', 'Glamour', 'Estética luxuosa, color grade rico, ideal para moda, beauty e lifestyle premium', ARRAY['luxo','beauty','lifestyle'], true, 7),
  ('a1b2c3d4-0008-0000-0000-000000000008', 'Humor', 'Timing cômico preciso, cortes de reação, trilha sonora bem posicionada', ARRAY['comedia','timing','entretenimento'], true, 8)
ON CONFLICT (id) DO NOTHING;

-- ─── Monthly Plans ────────────────────────────────────────────────────────────
-- Prices in cents (BRL): R$997 = 99700, R$1997 = 199700, R$2997 = 299700
INSERT INTO public.monthly_plans (id, name, price_cents, currency, videos_per_day, videos_per_month, is_active, features)
VALUES
  (
    'presenca_monthly',
    'Presença',
    99700,
    'BRL',
    1,
    30,
    true,
    '{
      "highlight": "Ideal para começar",
      "clips_per_month": 30,
      "clips_per_day": 1,
      "revision_per_clip": 1,
      "editing_styles": "all",
      "social_scheduling": true,
      "views_vault": false,
      "priority_support": false,
      "dedicated_editor": false
    }'::jsonb
  ),
  (
    'constancia_monthly',
    'Constância',
    199700,
    'BRL',
    2,
    60,
    true,
    '{
      "highlight": "Para crescer consistentemente",
      "clips_per_month": 60,
      "clips_per_day": 2,
      "revision_per_clip": 1,
      "editing_styles": "all",
      "social_scheduling": true,
      "views_vault": true,
      "priority_support": true,
      "dedicated_editor": false
    }'::jsonb
  ),
  (
    'dominio_monthly',
    'Domínio',
    299700,
    'BRL',
    3,
    90,
    true,
    '{
      "highlight": "Para dominar o mercado",
      "clips_per_month": 90,
      "clips_per_day": 3,
      "revision_per_clip": 2,
      "editing_styles": "all",
      "social_scheduling": true,
      "views_vault": true,
      "priority_support": true,
      "dedicated_editor": true
    }'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ─── How to create test users (cannot be done in pure SQL) ───────────────────
--
-- Test users must be created via the Supabase Dashboard or Auth API:
--
-- 1. Go to Supabase Dashboard → Authentication → Users → "Add user"
-- 2. Create the following test users:
--
--    a) Admin user:
--       Email:    admin@upfy.com.br
--       Password: [set securely]
--       Then run: UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@upfy.com.br';
--
--    b) Editor user:
--       Email:    editor@upfy.com.br
--       Password: [set securely]
--       Then run: UPDATE public.profiles SET role = 'editor' WHERE email = 'editor@upfy.com.br';
--
--    c) Test client:
--       Email:    cliente@teste.com.br
--       Password: [set securely]
--       (role defaults to 'client')
--
-- 3. After creating users, create org and credit balance for test client:
--    Replace 'YOUR_CLIENT_USER_UUID' with the actual UUID from auth.users.
--
-- INSERT INTO public.organizations (name, slug, owner_user_id, type, status)
-- VALUES ('Empresa Teste', 'empresa-teste', 'YOUR_CLIENT_USER_UUID', 'client', 'active');
--
-- INSERT INTO public.credit_balances (organization_id, balance)
-- SELECT id, 50000
-- FROM public.organizations WHERE slug = 'empresa-teste';
--
-- INSERT INTO public.organization_members (organization_id, user_id, role)
-- SELECT o.id, 'YOUR_CLIENT_USER_UUID', 'owner'
-- FROM public.organizations o WHERE o.slug = 'empresa-teste';
