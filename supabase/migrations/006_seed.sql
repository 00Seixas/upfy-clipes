-- This seed creates the admin user
-- Run this after creating the admin in Supabase Auth dashboard or via API
-- Then update the UUID below with the actual admin user ID

-- Followup messages template (stored in a separate table for admin to configure)
create table if not exists followup_templates (
  id integer primary key,
  day_number integer not null unique check (day_number between 1 and 7),
  message text not null,
  updated_at timestamptz default now()
);

alter table followup_templates enable row level security;

create policy "admin can manage followup templates" on followup_templates
  for all using (get_my_role() = 'admin');

create policy "admin can read followup templates" on followup_templates
  for select using (get_my_role() = 'admin');

insert into followup_templates (id, day_number, message) values
  (1, 1, 'Olá {nome}! Vi que seus clipes estão acabando 🎬 Renove agora e continue crescendo: {link}'),
  (2, 2, '{nome}, que tal continuar com a consistência? Seu link de renovação: {link}'),
  (3, 3, 'Oi {nome}! Não perca o ritmo. Renove sua assinatura: {link}'),
  (4, 4, '{nome}, ainda dá tempo! Renove e continue recebendo clipes todo dia: {link}'),
  (5, 5, 'Olá {nome}! Última chance de manter a consistência nas redes. Renove: {link}'),
  (6, 6, '{nome}, que pena que ainda não renovou 😢 Qualquer dúvida, é só chamar. Link: {link}'),
  (7, 7, 'Olá {nome}! É o último aviso sobre a renovação. Esperamos você de volta: {link}')
on conflict (id) do nothing;
