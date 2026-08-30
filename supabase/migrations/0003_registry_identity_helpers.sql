-- PowerFarm Registry -- identity/session helpers only.
-- Authority and runtime state live in PowerFarm Process, not Registry.

create or replace function public.identidade_atual()
returns uuid
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select identity_id
    from public.identity_links
   where supabase_user = auth.uid()
     and unlinked_at is null
   limit 1;
$$;

revoke execute on function public.identidade_atual() from public;
grant execute on function public.identidade_atual() to authenticated;
