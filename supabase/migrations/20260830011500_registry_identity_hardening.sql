-- PowerFarm Registry -- identity control-plane hardening.
--
-- Identity, keys and occupancy are Registry meaning. Ordinary authenticated
-- membership MUST NOT be enough to create or mutate them. This migration
-- replaces the bootstrap-era `eh_membro()` write policies with Registry-local
-- control-plane authorization and makes active occupancy singular per office.

-- One durable Office may have at most one current occupancy.
create unique index if not exists occupancies_one_active_per_identity
  on public.occupancies (identity_id)
  where valid_until is null;

-- Bootstrap-era policies were intentionally permissive before the standalone
-- Registry control plane existed. They are no longer valid.
drop policy if exists identities_escrita on public.identities;
drop policy if exists identity_keys_escrita on public.identity_keys;
drop policy if exists identity_keys_revoga on public.identity_keys;
drop policy if exists occupancies_escrita on public.occupancies;
drop policy if exists identity_links_propria on public.identity_links;

create policy identities_control_insert on public.identities
  for insert to authenticated
  with check (public.has_registry_control_role('admin'));

create policy identity_keys_control_insert on public.identity_keys
  for insert to authenticated
  with check (public.has_registry_control_role('admin'));

create policy identity_keys_control_update on public.identity_keys
  for update to authenticated
  using (public.has_registry_control_role('admin'))
  with check (public.has_registry_control_role('admin'));

create policy occupancies_control_insert on public.occupancies
  for insert to authenticated
  with check (public.has_registry_control_role('admin'));

create policy occupancies_control_update on public.occupancies
  for update to authenticated
  using (public.has_registry_control_role('admin'))
  with check (public.has_registry_control_role('admin'));

-- Linking an authenticated account to a durable Registry identity is itself an
-- identity-administration act. A user may not select an arbitrary identity_id
-- and claim it merely because the Supabase account is theirs.
create policy identity_links_control_insert on public.identity_links
  for insert to authenticated
  with check (public.has_registry_control_role('admin'));

create policy identity_links_control_update on public.identity_links
  for update to authenticated
  using (public.has_registry_control_role('admin'))
  with check (public.has_registry_control_role('admin'));
