alter table public.deliverables
  add column if not exists client_rating int check (client_rating between 1 and 5),
  add column if not exists client_rating_at timestamptz;
