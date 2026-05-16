-- profiles: extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  whatsapp text unique,  -- used as login identifier for clients (format: 5511999999999)
  email text,
  role text not null check (role in ('cliente', 'editor', 'admin')) default 'cliente',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- client_contracts: one per client
create table client_contracts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  clips_total integer not null default 30,
  clips_delivered integer not null default 0,
  start_date date not null default current_date,
  end_date date not null,
  payment_link text,
  notes text,
  status text not null check (status in ('ativo', 'encerrando', 'aguardando_renovacao', 'encerrado')) default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- orders: each video upload becomes an order
create table orders (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  editor_id uuid references profiles(id) on delete set null,
  status text not null check (status in ('aguardando', 'em_edicao', 'aprovacao', 'entregue')) default 'aguardando',
  briefing jsonb not null default '{}',
  deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- videos: raw video uploaded by client (one per order)
create table videos (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  r2_key text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  duration_seconds integer,
  created_at timestamptz default now()
);

-- deliverables: finished clip uploaded by editor, approved by admin
create table deliverables (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  editor_id uuid not null references profiles(id),
  r2_key text not null,
  filename text not null,
  clip_number integer not null,  -- sequential across entire contract
  virality_grade text not null check (virality_grade in ('frio', 'morno', 'quente', 'viral')),
  feedback text not null,
  delivered_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references profiles(id)
);

-- whatsapp_logs: all WhatsApp messages sent via Z-API
create table whatsapp_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id),
  phone text not null,
  message text not null,
  status text not null check (status in ('enviado', 'erro')) default 'enviado',
  error_details text,
  created_at timestamptz default now()
);

-- followup_sequences: automated follow-up messages scheduled per client
create table followup_sequences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id),
  day_number integer not null check (day_number between 1 and 7),
  message text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null check (status in ('pendente', 'enviado', 'erro')) default 'pendente',
  created_at timestamptz default now()
);

-- editor_invites: first-access tokens for editor email
create table editor_invites (
  id uuid primary key default uuid_generate_v4(),
  editor_id uuid not null references profiles(id),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  used boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);
