-- PowerFarm Registry -- identity/session helpers only.
-- Authority and runtime state live in PowerFarm Process, not Registry.
--
-- Version note. On the live powerfarm project version 0003 is already applied
-- as 0003_autoridade, so this file is skipped there. That is safe and
-- deliberate: identidade_atual() already exists on that database, created by
-- the same 0003_autoridade. The number cannot move, because a fresh install
-- needs this function before 20260820192536_gadget_store_lineage, which calls
-- it twelve times. Recorded in migration-lock.json rather than hidden.

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
