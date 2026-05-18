create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  platform_user_id text,
  platform_username text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

alter table public.social_connections enable row level security;

create policy "Users manage own social connections"
  on public.social_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
