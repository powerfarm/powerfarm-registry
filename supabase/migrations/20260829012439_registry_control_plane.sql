-- PowerFarm Registry -- local control-plane ACL and OAuth client links.
--
-- This table does not grant PowerFarm institutional authority. It only controls
-- administration of the standalone Registry/Identity product itself.

create table public.registry_control_memberships (
  identity_id uuid not null references public.identities(id) on delete cascade,
  role text not null check (role in ('admin','oauth_admin')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.identities(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (identity_id, role)
);

create or replace function public.has_registry_control_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.identity_links l
      join public.registry_control_memberships m on m.identity_id = l.identity_id
     where l.supabase_user = (select auth.uid())
       and l.unlinked_at is null
       and m.role = p_role
       and m.revoked_at is null
       and m.valid_from <= now()
       and (m.valid_until is null or m.valid_until > now())
  );
$$;

revoke all on function public.has_registry_control_role(text) from public;
revoke all on function public.has_registry_control_role(text) from anon;
grant execute on function public.has_registry_control_role(text) to authenticated;

insert into public.registry_control_memberships (identity_id, role, created_by)
select i.id, role, i.id
  from public.identities i
 cross join (values ('admin'), ('oauth_admin')) as requested(role)
 where i.kind = 'person'
   and i.name = 'danvoulez'
   and not exists (
     select 1 from public.registry_control_memberships m
      where m.identity_id = i.id and m.role = requested.role
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

alter table public.registry_control_memberships enable row level security;
alter table public.app_oauth_clients enable row level security;

revoke all on public.registry_control_memberships from anon, public;
revoke all on public.app_oauth_clients from anon, public;
grant select on public.registry_control_memberships to authenticated;
grant select, insert, update on public.app_oauth_clients to authenticated;

create policy registry_control_self_read on public.registry_control_memberships
  for select to authenticated
  using (
    identity_id = public.identidade_atual()
    or public.has_registry_control_role('admin')
  );

create policy app_oauth_clients_admin_read on public.app_oauth_clients
  for select to authenticated
  using (
    public.has_registry_control_role('admin')
    or public.has_registry_control_role('oauth_admin')
  );

create policy app_oauth_clients_admin_insert on public.app_oauth_clients
  for insert to authenticated
  with check (
    public.has_registry_control_role('admin')
    or public.has_registry_control_role('oauth_admin')
  );

create policy app_oauth_clients_admin_update on public.app_oauth_clients
  for update to authenticated
  using (
    public.has_registry_control_role('admin')
    or public.has_registry_control_role('oauth_admin')
  )
  with check (
    public.has_registry_control_role('admin')
    or public.has_registry_control_role('oauth_admin')
  );
