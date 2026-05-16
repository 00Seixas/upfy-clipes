-- Enable RLS on all tables
alter table profiles enable row level security;
alter table client_contracts enable row level security;
alter table orders enable row level security;
alter table videos enable row level security;
alter table deliverables enable row level security;
alter table whatsapp_logs enable row level security;
alter table followup_sequences enable row level security;
alter table editor_invites enable row level security;

-- Helper function to get current user role
create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- PROFILES
create policy "users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "admin can view all profiles" on profiles
  for select using (get_my_role() = 'admin');

create policy "admin can insert profiles" on profiles
  for insert with check (get_my_role() = 'admin');

create policy "admin can update profiles" on profiles
  for update using (get_my_role() = 'admin');

create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);

-- CLIENT_CONTRACTS
create policy "client can view own contract" on client_contracts
  for select using (auth.uid() = user_id);

create policy "admin can do everything on contracts" on client_contracts
  for all using (get_my_role() = 'admin');

-- ORDERS
create policy "client can view own orders" on orders
  for select using (auth.uid() = client_id);

create policy "client can insert own orders" on orders
  for insert with check (auth.uid() = client_id);

create policy "editor can view all orders" on orders
  for select using (get_my_role() = 'editor');

create policy "editor can update assigned orders" on orders
  for update using (
    get_my_role() = 'editor' and (editor_id = auth.uid() or editor_id is null)
  );

create policy "admin can do everything on orders" on orders
  for all using (get_my_role() = 'admin');

-- VIDEOS
create policy "client can view own videos" on videos
  for select using (
    exists (select 1 from orders where orders.id = videos.order_id and orders.client_id = auth.uid())
  );

create policy "client can insert own videos" on videos
  for insert with check (
    exists (select 1 from orders where orders.id = videos.order_id and orders.client_id = auth.uid())
  );

create policy "editor can view assigned videos" on videos
  for select using (
    exists (select 1 from orders where orders.id = videos.order_id and orders.editor_id = auth.uid())
  );

create policy "admin can do everything on videos" on videos
  for all using (get_my_role() = 'admin');

-- DELIVERABLES
create policy "client can view own deliverables" on deliverables
  for select using (
    exists (select 1 from orders where orders.id = deliverables.order_id and orders.client_id = auth.uid())
  );

create policy "editor can manage own deliverables" on deliverables
  for all using (editor_id = auth.uid());

create policy "admin can do everything on deliverables" on deliverables
  for all using (get_my_role() = 'admin');

-- WHATSAPP_LOGS
create policy "admin can do everything on whatsapp_logs" on whatsapp_logs
  for all using (get_my_role() = 'admin');

-- FOLLOWUP_SEQUENCES
create policy "admin can do everything on followup_sequences" on followup_sequences
  for all using (get_my_role() = 'admin');

-- EDITOR_INVITES
create policy "editor can view own invite" on editor_invites
  for select using (editor_id = auth.uid());

create policy "editor can update own invite" on editor_invites
  for update using (editor_id = auth.uid());

create policy "admin can do everything on editor_invites" on editor_invites
  for all using (get_my_role() = 'admin');
