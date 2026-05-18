-- Client approval step on deliverables
alter table public.deliverables
  add column if not exists client_approved_at  timestamptz,
  add column if not exists revision_requested_at timestamptz,
  add column if not exists revision_notes       text;

-- Scheduled posts for calendar
create table if not exists public.scheduled_posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  deliverable_id uuid references public.deliverables(id) on delete cascade,
  platform     text not null check (platform in ('tiktok','instagram')),
  scheduled_at timestamptz not null,
  caption      text,
  status       text not null default 'pending' check (status in ('pending','posted','failed')),
  posted_at    timestamptz,
  error        text,
  created_at   timestamptz default now()
);
alter table public.scheduled_posts enable row level security;
create policy "Users manage own scheduled posts"
  on public.scheduled_posts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
