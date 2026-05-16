-- Auto-update updated_at columns
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger client_contracts_updated_at before update on client_contracts
  for each row execute function update_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

-- Auto-create profile on auth user creation
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Usuário'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update contract status based on end_date
create or replace function update_contract_status()
returns void language plpgsql as $$
begin
  -- Mark as 'encerrando' if 3 days or less remaining
  update client_contracts
  set status = 'encerrando'
  where status = 'ativo'
    and end_date <= current_date + interval '3 days'
    and end_date >= current_date;

  -- Mark as 'aguardando_renovacao' if expired
  update client_contracts
  set status = 'aguardando_renovacao'
  where status in ('ativo', 'encerrando')
    and end_date < current_date;
end;
$$;
