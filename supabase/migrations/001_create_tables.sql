-- ============================================================
-- UPFY CLIPES — Migração 001: Criação de todas as tabelas
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";  -- para reset mensal de créditos

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('cliente', 'editor', 'admin');
CREATE TYPE order_type AS ENUM ('reel', 'longo');
CREATE TYPE order_status AS ENUM (
  'pending',
  'in_production',
  'review',
  'delivered',
  'revision_requested'
);
-- Escala de temperatura: frio (azul) → morno (roxo) → quente (laranja) → viral (vermelho)
CREATE TYPE virality_grade AS ENUM ('frio', 'morno', 'quente', 'viral');
CREATE TYPE social_platform AS ENUM ('instagram', 'tiktok', 'youtube');
CREATE TYPE post_status AS ENUM ('pending', 'posted', 'failed');
CREATE TYPE subscription_status AS ENUM (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid'
);
CREATE TYPE revision_status AS ENUM ('pending', 'in_review', 'done');
CREATE TYPE notification_type AS ENUM (
  'clipe_ready',
  'credits_low',
  'credits_empty',
  'upsell_usage',
  'upsell_7days',
  'new_youtube_video',
  'viral_alert',
  'revision_done'
);

-- ============================================================
-- TABELA: users
-- Estende auth.users do Supabase com dados de perfil
-- ============================================================

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'cliente',
  name        TEXT,
  phone       TEXT,
  style_id    UUID,                       -- estilo padrão selecionado
  autopilot   BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Perfis de usuário — clientes, editores e admins';

-- ============================================================
-- TABELA: styles
-- Estilos de clipe disponíveis (gerenciados pelo admin)
-- ============================================================

CREATE TABLE public.styles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  preview_url TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.styles IS 'Estilos de edição de clipe (ex: Raiam Santos, Podcast Viral)';

-- FK estilo padrão do usuário
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_style
  FOREIGN KEY (style_id) REFERENCES public.styles(id) ON DELETE SET NULL;

-- ============================================================
-- TABELA: credit_balances
-- Saldo de créditos de cada cliente
-- ============================================================

CREATE TABLE public.credit_balances (
  user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  credits_available INTEGER NOT NULL DEFAULT 0 CHECK (credits_available >= 0),
  credits_used      INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_balances IS 'Saldo de créditos por usuário';

-- ============================================================
-- TABELA: subscriptions
-- Assinaturas mensais via Stripe
-- ============================================================

CREATE TABLE public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status                 subscription_status NOT NULL DEFAULT 'active',
  credits_monthly        INTEGER NOT NULL DEFAULT 0,
  reset_date             TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscriptions IS 'Assinaturas mensais recorrentes';

-- ============================================================
-- TABELA: orders
-- Pedidos de clipes (reel avulso ou clipe de vídeo longo)
-- ============================================================

CREATE TABLE public.orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type             order_type NOT NULL,
  status           order_status NOT NULL DEFAULT 'pending',
  briefing         JSONB NOT NULL DEFAULT '{}',
  style_id         UUID REFERENCES public.styles(id) ON DELETE SET NULL,
  youtube_video_id TEXT,          -- ID do vídeo no YouTube (se tipo longo)
  credits_cost     INTEGER NOT NULL,
  deadline         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS 'Pedidos de clipes — reel avulso ou clipe de vídeo longo';

-- ============================================================
-- TABELA: videos
-- Vídeos brutos enviados pelos clientes
-- ============================================================

CREATE TABLE public.videos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  r2_url        TEXT NOT NULL,
  duration      NUMERIC,               -- duração em segundos
  transcription TEXT,                  -- texto completo da transcrição
  timestamps    JSONB,                 -- array de segmentos {id, start, end, text}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.videos IS 'Vídeos brutos + transcrição Whisper (visível só para editor/admin)';

-- ============================================================
-- TABELA: deliverables
-- Clipes finalizados pelo editor
-- ============================================================

CREATE TABLE public.deliverables (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  editor_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  r2_url         TEXT NOT NULL,
  virality_grade virality_grade NOT NULL DEFAULT 'baixo',
  feedback       TEXT NOT NULL DEFAULT '',
  approved       BOOLEAN NOT NULL DEFAULT FALSE,   -- aprovado pelo admin
  views          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.deliverables IS 'Clipes finalizados com grau de viralização e feedback';

-- ============================================================
-- TABELA: revisions
-- Solicitações de revisão (1 por clipe, 48h)
-- ============================================================

CREATE TABLE public.revisions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  status       revision_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.revisions IS 'Solicitações de revisão — 1 por pedido, prazo de 48h';

-- ============================================================
-- TABELA: credit_purchases
-- Histórico de compras de créditos avulsos
-- ============================================================

CREATE TABLE public.credit_purchases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credits           INTEGER NOT NULL CHECK (credits > 0),
  amount            INTEGER NOT NULL,  -- em centavos (BRL)
  stripe_payment_id TEXT NOT NULL UNIQUE,
  package_id        TEXT,              -- 'starter' | 'creator' | 'pro'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_purchases IS 'Histórico de compras de créditos avulsos via Stripe';

-- ============================================================
-- TABELA: social_connections
-- Contas sociais conectadas (YouTube, Instagram, TikTok)
-- ============================================================

CREATE TABLE public.social_connections (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform            social_platform NOT NULL,
  access_token        TEXT NOT NULL,
  refresh_token       TEXT,
  platform_user_id    TEXT,
  platform_channel_id TEXT,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

COMMENT ON TABLE public.social_connections IS 'Tokens OAuth de redes sociais conectadas';

-- ============================================================
-- TABELA: post_logs
-- Registro de postagens automáticas
-- ============================================================

CREATE TABLE public.post_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  platform       social_platform NOT NULL,
  status         post_status NOT NULL DEFAULT 'pending',
  external_id    TEXT,           -- ID do post na plataforma
  error          TEXT,
  posted_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.post_logs IS 'Histórico de postagens automáticas (Instagram e TikTok)';

-- ============================================================
-- TABELA: post_schedule
-- Configuração de agendamento de postagem
-- ============================================================

CREATE TABLE public.post_schedule (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform     social_platform NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{}',  -- 0=Dom, 1=Seg, ..., 6=Sab
  time         TIME NOT NULL DEFAULT '19:00',
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, platform)
);

COMMENT ON TABLE public.post_schedule IS 'Configuração de horários de postagem automática';

-- ============================================================
-- TABELA: notifications
-- Notificações in-app para clientes
-- ============================================================

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notificações in-app para clientes';
