-- Registry OAuth administration is an explicit mandate, not ordinary membership.

create or replace function public.has_registry_grant(p_action text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.identity_links l
      join public.grants g on g.identity_id = l.identity_id
     where l.supabase_user = (select auth.uid())
       and l.unlinked_at is null
       and g.action = p_action
       and g.revoked_at is null
       and g.valid_from <= now()
       and (g.valid_until is null or g.valid_until > now())
  );
$$;

revoke all on function public.has_registry_grant(text) from public;
revoke all on function public.has_registry_grant(text) from anon;
grant execute on function public.has_registry_grant(text) to authenticated;

insert into public.grants (identity_id, action, resource, granted_by)
select i.id, action, 'registry', i.id
  from public.identities i
 cross join (values ('registry.admin'), ('oauth.clients.manage')) as requested(action)
 where i.kind = 'person'
   and i.name = 'danvoulez'
   and not exists (
     select 1 from public.grants g
      where g.identity_id = i.id
        and g.action = requested.action
        and g.revoked_at is null
   );

create table public.app_oauth_clients (
  id uuid primary key default gen_random_uuid(),
  app_identity_id uuid not null references public.identities(id) on delete restrict,
  oauth_client_id uuid not null unique,
  environment text not null check (environment in ('development', 'preview', 'production')),
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'active', 'unlinked', 'revoked')),
  created_by uuid not null references public.identities(id) on delete restrict,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  revoked_at timestamptz,
  check (verified_at is null or status in ('active', 'revoked')),
  check (revoked_at is null or status = 'revoked')
);

create index app_oauth_clients_app_identity_idx on public.app_oauth_clients (app_identity_id);
create index app_oauth_clients_created_by_idx on public.app_oauth_clients (created_by);
create index app_oauth_clients_active_idx on public.app_oauth_clients (environment, status)
  where revoked_at is null;

alter table public.app_oauth_clients enable row level security;

revoke all on public.app_oauth_clients from anon;
revoke all on public.app_oauth_clients from public;
grant select, insert, update on public.app_oauth_clients to authenticated;

create policy app_oauth_clients_admin_read on public.app_oauth_clients
  for select to authenticated
  using (
    public.has_registry_grant('registry.admin')
    or public.has_registry_grant('oauth.clients.manage')
  );

create policy app_oauth_clients_admin_insert on public.app_oauth_clients
  for insert to authenticated
  with check (
    public.has_registry_grant('registry.admin')
    or public.has_registry_grant('oauth.clients.manage')
  );

create policy app_oauth_clients_admin_update on public.app_oauth_clients
  for update to authenticated
  using (
    public.has_registry_grant('registry.admin')
    or public.has_registry_grant('oauth.clients.manage')
  )
  with check (
    public.has_registry_grant('registry.admin')
    or public.has_registry_grant('oauth.clients.manage')
  );

drop policy if exists grants_leitura on public.grants;
drop policy if exists grants_escrita on public.grants;
drop policy if exists grants_revoga on public.grants;

create policy grants_leitura on public.grants
  for select to authenticated
  using (
    identity_id in (
      select l.identity_id from public.identity_links l
       where l.supabase_user = (select auth.uid()) and l.unlinked_at is null
    )
    or public.has_registry_grant('registry.admin')
  );

create policy grants_escrita on public.grants
  for insert to authenticated
  with check (public.has_registry_grant('registry.admin'));

create policy grants_revoga on public.grants
  for update to authenticated
  using (public.has_registry_grant('registry.admin'))
  with check (public.has_registry_grant('registry.admin'));
