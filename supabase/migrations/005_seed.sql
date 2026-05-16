-- ============================================================
-- UPFY CLIPES — Migração 005: Dados iniciais (seed)
-- ============================================================

-- ============================================================
-- Estilos de clipe iniciais
-- ============================================================

INSERT INTO public.styles (id, name, description, preview_url, active) VALUES
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Estilo Raiam Santos',
  'Ritmo acelerado, cortes rápidos e legendas dinâmicas. Ideal para reter atenção nos primeiros 3 segundos.',
  '',  -- preencher com URL do vídeo de prévia no R2
  TRUE
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Estilo Corte Direto',
  'Sem rodeios — vai direto ao ponto com impacto visual. Cortes secos e objetivos que mantêm o espectador engajado.',
  '',
  TRUE
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Estilo Podcast Viral',
  'Ideal para cortes de conversas e entrevistas. Destaca os momentos mais impactantes com legendas e B-roll.',
  '',
  TRUE
),
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Estilo Educativo',
  'Clareza, didática e alta retenção do início ao fim. Perfeito para conteúdo de valor com chamada pra ação.',
  '',
  TRUE
);

-- ============================================================
-- Usuário admin padrão (substitua o email antes de rodar)
-- ============================================================
-- ATENÇÃO: crie o usuário primeiro via Supabase Auth (UI ou CLI)
-- depois rode este INSERT com o UUID gerado.

-- INSERT INTO public.users (id, email, role, name)
-- VALUES (
--   'SEU-UUID-AQUI',
--   'admin@upfyclipes.com.br',
--   'admin',
--   'Admin UPFY'
-- );

-- INSERT INTO public.credit_balances (user_id, credits_available, credits_used)
-- VALUES ('SEU-UUID-AQUI', 0, 0);
