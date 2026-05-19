-- Caption pre-written by editor, shown to client on posting
alter table public.deliverables
  add column if not exists social_caption text;

-- Hashtag presets saved per editor
alter table public.profiles
  add column if not exists hashtag_presets jsonb not null default '[]'::jsonb;
