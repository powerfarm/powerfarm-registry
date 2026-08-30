-- PowerFarm Registry -- production directory and runtime identity boundary.
--
-- Registry remains the source of institutional identity reality. These RPCs
-- expose read-only, versioned snapshots for Process/Organism and a tightly
-- scoped runtime-subject lookup used by the private Registry token issuer.
-- No institutional Authority, RunGrant, Process consequence or engine state is
-- created here.

-- Stable PowerFarm refs are explicit. Existing rows may be backfilled by an
-- administrator; new production integrations resolve only rows with a ref.
alter table public.identities
  add column if not exists institutional_ref text;

alter table public.identities
  drop constraint if exists identities_institutional_ref_format;
alter table public.identities
  add constraint identities_institutional_ref_format
  check (
    institutional_ref is null
    or institutional_ref ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'
  );

create unique index if not exists identities_institutional_ref_unique
  on public.identities (institutional_ref)
  where institutional_ref is not null;

-- Occupancy must name the replaceable occupant explicitly. Historical rows in
-- the original Registry only carried definition_hash, so their deterministic
-- occupant ref is backfilled as a definition ref without inventing Identity.
alter table public.occupancies
  add column if not exists occupant_ref text;

update public.occupancies
   set occupant_ref = 'pf.definition.' || lower(definition_hash)
 where occupant_ref is null;

alter table public.occupancies
  alter column occupant_ref set not null;
alter table public.occupancies
  drop constraint if exists occupancies_occupant_ref_format;
alter table public.occupancies
  add constraint occupancies_occupant_ref_format
  check (occupant_ref ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$');

-- Registry key custody now exposes the exact JWK and the Continuum-compatible
-- SHA-256 fingerprint explicitly. Existing keys remain readable but are not
-- eligible for ES256 admission until an administrator backfills these fields.
alter table public.identity_keys
  add column if not exists key_fingerprint text,
  add column if not exists jwk jsonb;

alter table public.identity_keys
  drop constraint if exists identity_keys_fingerprint_format;
alter table public.identity_keys
  add constraint identity_keys_fingerprint_format
  check (key_fingerprint is null or key_fingerprint ~ '^[0-9a-f]{64}$');

alter table public.identity_keys
  drop constraint if exists identity_keys_jwk_object;
alter table public.identity_keys
  add constraint identity_keys_jwk_object
  check (jwk is null or jsonb_typeof(jwk) = 'object');

create unique index if not exists identity_keys_fingerprint_unique
  on public.identity_keys (key_fingerprint)
  where key_fingerprint is not null;

-- Runtime token issuance is Registry-local control-plane configuration. It is
-- not PowerFarm Authority. The private Registry Worker uses this table to map
-- an institutional runtime subject to the dedicated Supabase auth principal
-- whose short-lived JWT it may mint.
create table if not exists public.registry_runtime_subjects (
  identity_id uuid primary key references public.identities(id) on delete cascade,
  subject_ref text not null unique
    check (subject_ref ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'),
  supabase_user uuid not null unique references auth.users(id) on delete restrict,
  allowed_audiences text[] not null default array['powerfarm.supabase.postgrest']::text[],
  max_ttl_seconds integer not null default 300 check (max_ttl_seconds between 30 and 900),
  active boolean not null default true,
  created_by uuid not null references public.identities(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(allowed_audiences) > 0)
);

alter table public.registry_runtime_subjects enable row level security;
revoke all on public.registry_runtime_subjects from public, anon;
grant select, insert, update, delete on public.registry_runtime_subjects to authenticated;

create policy registry_runtime_subjects_admin_read on public.registry_runtime_subjects
  for select to authenticated
  using (public.has_registry_control_role('admin'));
create policy registry_runtime_subjects_admin_write on public.registry_runtime_subjects
  for all to authenticated
  using (public.has_registry_control_role('admin'))
  with check (public.has_registry_control_role('admin'));

-- The durable Heartime runtime identity exists in Registry even before an auth
-- principal is linked. Token issuance remains disabled until an admin creates
-- registry_runtime_subjects for it.
insert into public.identities (kind, name, mandate, institutional_ref)
values (
  'app',
  'heartime-runtime',
  'Carries PowerFarm circulation time; owns no institutional Authority.',
  'pf.runtime.heartime'
)
on conflict (kind, name) do update
   set institutional_ref = coalesce(public.identities.institutional_ref, excluded.institutional_ref);

-- The Process writer gets a sibling runtime identity. This identity may obtain
-- a short-lived database credential but still owns no institutional Authority.
insert into public.identities (kind, name, mandate, institutional_ref)
values (
  'app',
  'process-writer-runtime',
  'Persists already-admitted Continuum acts; owns no institutional Authority.',
  'pf.runtime.process-writer'
)
on conflict (kind, name) do update
   set institutional_ref = coalesce(public.identities.institutional_ref, excluded.institutional_ref);

-- Read-only Office/Occupancy snapshot. `p_at` makes historical replay explicit.
create or replace function public.powerfarm_registry_office_snapshot_v1(
  p_office_ref text,
  p_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_office public.identities%rowtype;
  v_occupancy public.occupancies%rowtype;
begin
  if p_office_ref is null or p_office_ref !~ '^pf(\.[a-z0-9][a-z0-9-]*)+$' then
    raise exception 'invalid_office_ref';
  end if;
  if p_at is null then raise exception 'observation_time_required'; end if;

  select * into v_office
    from public.identities
   where institutional_ref = p_office_ref
     and kind = 'office';

  if not found then
    return jsonb_build_object(
      'contract_version', 'powerfarm.registry.directory.v1',
      'data', jsonb_build_object(
        'office_ref', p_office_ref,
        'exists', false,
        'observed_at', p_at,
        'occupancy', null
      )
    );
  end if;

  select * into v_occupancy
    from public.occupancies
   where identity_id = v_office.id
     and valid_from <= p_at
     and (valid_until is null or valid_until > p_at)
   order by valid_from desc, created_at desc
   limit 1;

  return jsonb_build_object(
    'contract_version', 'powerfarm.registry.directory.v1',
    'data', jsonb_build_object(
      'office_ref', p_office_ref,
      'office_identity_id', v_office.id,
      'exists', true,
      'observed_at', p_at,
      'occupancy', case when v_occupancy.id is null then null else jsonb_build_object(
        'occupancy_ref', 'pf.occupancy.' || v_occupancy.id::text,
        'principal_ref', v_occupancy.occupant_ref,
        'definition_hash', lower(v_occupancy.definition_hash),
        'valid_from', v_occupancy.valid_from,
        'valid_until', v_occupancy.valid_until
      ) end
    )
  );
end;
$$;

-- Public-key lookup is historical and read-only. The Office owns the signing
-- key; the current occupant is checked independently at the same observation
-- instant before the key is returned.
create or replace function public.powerfarm_registry_key_binding_v1(
  p_key_fingerprint text,
  p_principal_ref text,
  p_office_ref text,
  p_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_office public.identities%rowtype;
  v_occupancy public.occupancies%rowtype;
  v_key public.identity_keys%rowtype;
begin
  if p_key_fingerprint is null or p_key_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_key_fingerprint';
  end if;
  if p_principal_ref is null or p_principal_ref !~ '^pf(\.[a-z0-9][a-z0-9-]*)+$' then
    raise exception 'invalid_principal_ref';
  end if;
  if p_office_ref is null or p_office_ref !~ '^pf(\.[a-z0-9][a-z0-9-]*)+$' then
    raise exception 'invalid_office_ref';
  end if;
  if p_at is null then raise exception 'observation_time_required'; end if;

  select * into v_office
    from public.identities
   where institutional_ref = p_office_ref
     and kind = 'office';
  if not found then return null; end if;

  select * into v_occupancy
    from public.occupancies
   where identity_id = v_office.id
     and occupant_ref = p_principal_ref
     and valid_from <= p_at
     and (valid_until is null or valid_until > p_at)
   order by valid_from desc, created_at desc
   limit 1;
  if not found then return null; end if;

  select * into v_key
    from public.identity_keys
   where identity_id = v_office.id
     and key_fingerprint = p_key_fingerprint
     and algorithm = 'ES256'
     and jwk is not null
     and valid_from <= p_at
     and (valid_until is null or valid_until > p_at)
     and (revoked_at is null or revoked_at > p_at)
   order by valid_from desc, created_at desc
   limit 1;
  if not found then return null; end if;

  return jsonb_build_object(
    'contract_version', 'powerfarm.registry.directory.v1',
    'data', jsonb_build_object(
      'key_id', lower(v_key.key_fingerprint),
      'principal', p_principal_ref,
      'office', p_office_ref,
      'occupancy_ref', 'pf.occupancy.' || v_occupancy.id::text,
      'jwk', v_key.jwk,
      'valid_from', v_key.valid_from,
      'valid_until', v_key.valid_until,
      'revoked_at', v_key.revoked_at
    )
  );
end;
$$;

-- Private token issuer lookup. The RPC carries no signing secret and creates no
-- JWT. It only validates Registry-local subject/audience/TTL configuration.
create or replace function public.powerfarm_registry_runtime_subject_v1(
  p_subject_ref text,
  p_audience text,
  p_minimum_ttl_seconds integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_subject public.registry_runtime_subjects%rowtype;
  v_identity public.identities%rowtype;
begin
  if p_subject_ref is null or p_subject_ref !~ '^pf(\.[a-z0-9][a-z0-9-]*)+$' then
    raise exception 'invalid_subject_ref';
  end if;
  if p_audience is null or length(p_audience) = 0 then raise exception 'audience_required'; end if;
  if p_minimum_ttl_seconds is null or p_minimum_ttl_seconds < 10 then
    raise exception 'minimum_ttl_too_small';
  end if;

  select * into v_subject
    from public.registry_runtime_subjects
   where subject_ref = p_subject_ref
     and active = true;
  if not found then raise exception 'runtime_subject_not_configured'; end if;

  select * into v_identity
    from public.identities
   where id = v_subject.identity_id
     and institutional_ref = p_subject_ref
     and kind = 'app';
  if not found then raise exception 'runtime_subject_identity_mismatch'; end if;

  if not (p_audience = any(v_subject.allowed_audiences)) then
    raise exception 'runtime_audience_not_allowed';
  end if;
  if p_minimum_ttl_seconds > v_subject.max_ttl_seconds then
    raise exception 'runtime_ttl_exceeds_subject_max';
  end if;

  return jsonb_build_object(
    'contract_version', 'powerfarm.registry.runtime-subject.v1',
    'data', jsonb_build_object(
      'subject_ref', v_subject.subject_ref,
      'supabase_user', v_subject.supabase_user,
      'max_ttl_seconds', v_subject.max_ttl_seconds,
      'audience', p_audience
    )
  );
end;
$$;

revoke all on function public.powerfarm_registry_office_snapshot_v1(text,timestamptz) from public;
revoke all on function public.powerfarm_registry_key_binding_v1(text,text,text,timestamptz) from public;
revoke all on function public.powerfarm_registry_runtime_subject_v1(text,text,integer) from public;

grant execute on function public.powerfarm_registry_office_snapshot_v1(text,timestamptz) to anon, authenticated;
grant execute on function public.powerfarm_registry_key_binding_v1(text,text,text,timestamptz) to anon, authenticated;
grant execute on function public.powerfarm_registry_runtime_subject_v1(text,text,integer) to anon, authenticated;
