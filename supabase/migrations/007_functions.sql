-- Increment clips_delivered on client's active contract
create or replace function increment_clips_delivered(p_client_id uuid)
returns void language plpgsql security definer as $$
begin
  update client_contracts
  set clips_delivered = clips_delivered + 1
  where user_id = p_client_id
    and status in ('ativo', 'encerrando');
end;
$$;
