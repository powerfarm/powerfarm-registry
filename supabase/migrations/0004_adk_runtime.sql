-- Powerfarm v0.1 — ADK-JS durable truth. Migration 04.
--
-- Compute may disappear after every request. The mutable run row is the current
-- state; ADK events and run checkpoints are append-only provenance. Runtime
-- writes carry the caller's Supabase JWT and are constrained by RLS.

create schema if not exists adk;
revoke all on schema adk from public;
grant usage on schema adk to authenticated;

create or replace function public.identidade_atual()
returns uuid
language sql
stable
security definer
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

insert into public.identities (kind, name, mandate)
values ('app', 'pf.engine', 'Executa Gadgets agenticos sem deter credenciais de provedor.')
on conflict (kind, name) do nothing;

alter table public.runs drop constraint runs_status_check;
alter table public.runs
  add constraint runs_status_check
  check (status in ('created','running','waiting_input','completed','failed','cancelled'));

alter table public.runs
  add column gadget_id text,
  add column gadget_version text,
  add column definition_hash text
    check (definition_hash is null or definition_hash ~ '^[0-9a-f]{64}$'),
  add column idempotency_key text,
  add column result jsonb,
  add column error jsonb,
  add column updated_at timestamptz not null default now();

create unique index runs_idempotency
  on public.runs (created_by, gadget_id, idempotency_key)
  where idempotency_key is not null;

create table adk.sessions (
  app_name         text not null,
  user_id          uuid not null references public.identities(id),
  id               text not null,
  gadget_id        text not null,
  gadget_version   text not null,
  definition_hash  text not null check (definition_hash ~ '^[0-9a-f]{64}$'),
  state            jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(state) = 'object'),
  last_update_time double precision not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (app_name, user_id, id)
);

create table adk.events (
  sequence          bigint generated always as identity primary key,
  app_name          text not null,
  user_id           uuid not null,
  session_id        text not null,
  event_id          text not null,
  event_hash        text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  event              jsonb not null check (jsonb_typeof(event) = 'object'),
  event_timestamp    double precision not null,
  created_at         timestamptz not null default now(),
  foreign key (app_name, user_id, session_id)
    references adk.sessions(app_name, user_id, id) on delete cascade,
  unique (app_name, user_id, session_id, event_id)
);

create table adk.checkpoints (
  id            bigint generated always as identity primary key,
  run_id        uuid not null references public.runs(id) on delete cascade,
  ordinal       integer not null check (ordinal >= 0),
  status        text not null
                check (status in ('created','running','waiting_input','completed','failed','cancelled')),
  state         jsonb not null default '{}'::jsonb
                check (jsonb_typeof(state) = 'object'),
  pending_input jsonb,
  result        jsonb,
  created_at    timestamptz not null default now(),
  unique (run_id, ordinal)
);

create table adk.effects (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.runs(id) on delete cascade,
  owner_id        uuid not null references public.identities(id),
  gadget_id       text not null,
  capability_id   text not null,
  idempotency_key text not null,
  request_hash    text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status          text not null default 'claimed'
                  check (status in ('claimed','completed','uncertain','failed')),
  result          jsonb,
  error           jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_id, gadget_id, capability_id, idempotency_key)
);

create index adk_events_session_order
  on adk.events (app_name, user_id, session_id, sequence);
create index adk_checkpoints_run_order
  on adk.checkpoints (run_id, ordinal desc);
create index adk_effects_run
  on adk.effects (run_id, created_at);

alter table adk.sessions enable row level security;
alter table adk.events enable row level security;
alter table adk.checkpoints enable row level security;
alter table adk.effects enable row level security;

grant select, insert, update, delete on adk.sessions to authenticated;
grant select, insert on adk.events to authenticated;
grant select, insert on adk.checkpoints to authenticated;
grant select, insert, update on adk.effects to authenticated;
grant usage, select on all sequences in schema adk to authenticated;

create policy adk_sessions_proprias on adk.sessions
  for all to authenticated
  using (user_id = public.identidade_atual())
  with check (user_id = public.identidade_atual());

create policy adk_events_proprios on adk.events
  for all to authenticated
  using (user_id = public.identidade_atual())
  with check (user_id = public.identidade_atual());

create policy adk_checkpoints_proprios on adk.checkpoints
  for all to authenticated
  using (exists (
    select 1 from public.runs r
     where r.id = run_id and r.created_by = public.identidade_atual()
  ))
  with check (exists (
    select 1 from public.runs r
     where r.id = run_id and r.created_by = public.identidade_atual()
  ));

create policy adk_effects_proprios on adk.effects
  for all to authenticated
  using (
    owner_id = public.identidade_atual()
    and exists (
      select 1 from public.runs r
       where r.id = run_id and r.created_by = public.identidade_atual()
    )
  )
  with check (
    owner_id = public.identidade_atual()
    and exists (
      select 1 from public.runs r
       where r.id = run_id and r.created_by = public.identidade_atual()
    )
  );

create or replace function public.powerfarm_session_create(
  p_app_name text,
  p_session_id text,
  p_gadget_id text,
  p_gadget_version text,
  p_definition_hash text,
  p_state jsonb,
  p_last_update_time double precision
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_user uuid := public.identidade_atual();
  v_session adk.sessions%rowtype;
begin
  if v_user is null then raise exception 'Powerfarm identity link required'; end if;

  insert into adk.sessions (
    app_name, user_id, id, gadget_id, gadget_version,
    definition_hash, state, last_update_time
  ) values (
    p_app_name, v_user, p_session_id, p_gadget_id, p_gadget_version,
    p_definition_hash, coalesce(p_state, '{}'::jsonb), p_last_update_time
  ) on conflict (app_name, user_id, id) do nothing;

  select * into strict v_session
    from adk.sessions
   where app_name = p_app_name and user_id = v_user and id = p_session_id;

  if v_session.gadget_id <> p_gadget_id
     or v_session.gadget_version <> p_gadget_version
     or v_session.definition_hash <> p_definition_hash then
    raise exception 'Session identity conflicts with existing durable session';
  end if;
  return to_jsonb(v_session);
end;
$$;

create or replace function public.powerfarm_session_get(
  p_app_name text,
  p_session_id text,
  p_num_recent_events integer default null,
  p_after_timestamp double precision default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, adk, pg_temp
as $$
  select to_jsonb(s) || jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(e.event order by e.sequence)
        from (
          select e.*
            from adk.events e
           where e.app_name = s.app_name
             and e.user_id = s.user_id
             and e.session_id = s.id
             and (p_after_timestamp is null or e.event_timestamp > p_after_timestamp)
           order by e.sequence desc
           limit case when p_num_recent_events is null then 2147483647 else p_num_recent_events end
        ) e
    ), '[]'::jsonb)
  )
    from adk.sessions s
   where s.app_name = p_app_name
     and s.user_id = public.identidade_atual()
     and s.id = p_session_id;
$$;

create or replace function public.powerfarm_session_list(
  p_app_name text,
  p_limit integer default null,
  p_offset integer default 0,
  p_order text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, adk, pg_temp
as $$
  with owned as (
    select s.*
      from adk.sessions s
     where s.app_name = p_app_name
       and s.user_id = public.identidade_atual()
  ), page_rows as (
    select * from owned
     order by
       case when p_order = 'asc' then last_update_time end asc,
       case when p_order = 'desc' then last_update_time end desc,
       id asc
     offset greatest(coalesce(p_offset, 0), 0)
     limit p_limit
  )
  select jsonb_build_object(
    'sessions', coalesce(jsonb_agg(to_jsonb(page_rows) - 'state'), '[]'::jsonb),
    'totalItems', (select count(*) from owned)
  ) from page_rows;
$$;

create or replace function public.powerfarm_session_delete(
  p_app_name text,
  p_session_id text
)
returns boolean
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_count integer;
begin
  delete from adk.sessions
   where app_name = p_app_name
     and user_id = public.identidade_atual()
     and id = p_session_id;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.powerfarm_session_append_event(
  p_app_name text,
  p_session_id text,
  p_event_id text,
  p_event_hash text,
  p_event jsonb,
  p_event_timestamp double precision,
  p_state jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_user uuid := public.identidade_atual();
  v_hash text;
  v_inserted boolean := false;
begin
  insert into adk.events (
    app_name, user_id, session_id, event_id, event_hash, event, event_timestamp
  ) values (
    p_app_name, v_user, p_session_id, p_event_id, p_event_hash, p_event, p_event_timestamp
  ) on conflict (app_name, user_id, session_id, event_id) do nothing
  returning true into v_inserted;

  select event_hash into strict v_hash
    from adk.events
   where app_name = p_app_name and user_id = v_user
     and session_id = p_session_id and event_id = p_event_id;
  if v_hash <> p_event_hash then
    raise exception 'Event id reused with different content';
  end if;
  if not v_inserted then
    return p_event;
  end if;

  update adk.sessions
     set state = p_state,
         last_update_time = p_event_timestamp,
         updated_at = now()
   where app_name = p_app_name and user_id = v_user and id = p_session_id;
  if not found then raise exception 'Session not found'; end if;
  return p_event;
end;
$$;

create or replace function public.powerfarm_run_create(
  p_gadget_id text,
  p_gadget_version text,
  p_definition_hash text,
  p_session_id text,
  p_idempotency_key text,
  p_intent text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_user uuid := public.identidade_atual();
  v_engine uuid;
  v_run public.runs%rowtype;
begin
  if v_user is null then raise exception 'Powerfarm identity link required'; end if;
  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'Idempotency key is required';
  end if;
  select id into strict v_engine from public.identities where kind = 'app' and name = 'pf.engine';

  insert into public.runs (
    office_id, intent, engine, engine_ref, status, created_by,
    gadget_id, gadget_version, definition_hash, idempotency_key
  ) values (
    v_engine, p_intent, 'adk-js@1.6.0', p_session_id, 'created', v_user,
    p_gadget_id, p_gadget_version, p_definition_hash, p_idempotency_key
  ) on conflict (created_by, gadget_id, idempotency_key)
      where idempotency_key is not null do nothing;

  select * into strict v_run
    from public.runs
   where created_by = v_user and gadget_id = p_gadget_id
     and idempotency_key = p_idempotency_key;

  if v_run.gadget_version <> p_gadget_version
     or v_run.definition_hash <> p_definition_hash
     or v_run.engine_ref <> p_session_id
     or v_run.intent <> p_intent then
    raise exception 'Idempotency key reused for a different invocation';
  end if;

  insert into adk.checkpoints (run_id, ordinal, status, state)
  values (v_run.id, 0, 'created', '{}'::jsonb)
  on conflict (run_id, ordinal) do nothing;
  return to_jsonb(v_run);
end;
$$;

create or replace function public.powerfarm_run_get(p_run_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, adk, pg_temp
as $$
  select to_jsonb(r) || jsonb_build_object(
    'checkpoint', (
      select to_jsonb(c) from adk.checkpoints c
       where c.run_id = r.id order by c.ordinal desc limit 1
    )
  )
    from public.runs r
   where r.id = p_run_id and r.created_by = public.identidade_atual();
$$;

create or replace function public.powerfarm_run_transition(
  p_run_id uuid,
  p_expected text[],
  p_next text,
  p_state jsonb default '{}'::jsonb,
  p_pending_input jsonb default null,
  p_result jsonb default null,
  p_error jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_run public.runs%rowtype;
  v_ordinal integer;
begin
  select * into v_run
    from public.runs
   where id = p_run_id and created_by = public.identidade_atual()
   for update;
  if not found then raise exception 'Run not found'; end if;

  if v_run.status = p_next then return to_jsonb(v_run); end if;
  if not (v_run.status = any(p_expected)) then
    raise exception 'Invalid run transition from % to %', v_run.status, p_next;
  end if;
  if not (
    (v_run.status = 'created' and p_next in ('running','cancelled'))
    or (v_run.status = 'running' and p_next in ('waiting_input','completed','failed','cancelled'))
    or (v_run.status = 'waiting_input' and p_next in ('running','cancelled'))
  ) then
    raise exception 'Invalid run transition from % to %', v_run.status, p_next;
  end if;

  update public.runs
     set status = p_next,
         result = p_result,
         error = p_error,
         updated_at = now(),
         ended_at = case when p_next in ('completed','failed','cancelled') then now() else null end
   where id = p_run_id
     and created_by = public.identidade_atual()
     and status = v_run.status
  returning * into v_run;
  if not found then raise exception 'Concurrent run transition'; end if;

  select coalesce(max(ordinal), -1) + 1 into v_ordinal
    from adk.checkpoints where run_id = p_run_id;
  insert into adk.checkpoints (run_id, ordinal, status, state, pending_input, result)
  values (p_run_id, v_ordinal, p_next, coalesce(p_state, '{}'::jsonb), p_pending_input, p_result);
  return to_jsonb(v_run);
end;
$$;

create or replace function public.powerfarm_effect_claim(
  p_run_id uuid,
  p_gadget_id text,
  p_capability_id text,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_user uuid := public.identidade_atual();
  v_inserted boolean := false;
  v_effect adk.effects%rowtype;
begin
  if v_user is null then raise exception 'Powerfarm identity link required'; end if;
  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'Idempotency key is required';
  end if;
  if not exists (
    select 1 from public.runs r
     where r.id = p_run_id and r.created_by = v_user
  ) then raise exception 'Run not found'; end if;

  insert into adk.effects (
    run_id, owner_id, gadget_id, capability_id, idempotency_key, request_hash
  ) values (
    p_run_id, v_user, p_gadget_id, p_capability_id, p_idempotency_key, p_request_hash
  ) on conflict (owner_id, gadget_id, capability_id, idempotency_key) do nothing
  returning true into v_inserted;

  select * into strict v_effect from adk.effects
   where owner_id = v_user and gadget_id = p_gadget_id
     and capability_id = p_capability_id and idempotency_key = p_idempotency_key;
  if v_effect.request_hash <> p_request_hash then
    raise exception 'Idempotency key reused with different effect input';
  end if;

  return jsonb_build_object(
    'decision', case
      when v_inserted then 'execute'
      when v_effect.status = 'completed' then 'replay'
      else 'blocked'
    end,
    'effect', to_jsonb(v_effect)
  );
end;
$$;

create or replace function public.powerfarm_effect_complete(
  p_effect_id uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_effect adk.effects%rowtype;
begin
  update adk.effects
     set status = 'completed', result = p_result, error = null, updated_at = now()
   where id = p_effect_id and owner_id = public.identidade_atual() and status = 'claimed'
  returning * into v_effect;
  if not found then
    select * into strict v_effect from adk.effects
     where id = p_effect_id and owner_id = public.identidade_atual();
    if v_effect.status <> 'completed' then raise exception 'Effect is not claimable'; end if;
  end if;
  return to_jsonb(v_effect);
end;
$$;

create or replace function public.powerfarm_effect_uncertain(
  p_effect_id uuid,
  p_error jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, adk, pg_temp
as $$
declare
  v_effect adk.effects%rowtype;
begin
  update adk.effects
     set status = 'uncertain', error = p_error, updated_at = now()
   where id = p_effect_id and owner_id = public.identidade_atual() and status = 'claimed'
  returning * into strict v_effect;
  return to_jsonb(v_effect);
end;
$$;

revoke execute on function public.powerfarm_session_create(text,text,text,text,text,jsonb,double precision) from public;
revoke execute on function public.powerfarm_session_get(text,text,integer,double precision) from public;
revoke execute on function public.powerfarm_session_list(text,integer,integer,text) from public;
revoke execute on function public.powerfarm_session_delete(text,text) from public;
revoke execute on function public.powerfarm_session_append_event(text,text,text,text,jsonb,double precision,jsonb) from public;
revoke execute on function public.powerfarm_run_create(text,text,text,text,text,text) from public;
revoke execute on function public.powerfarm_run_get(uuid) from public;
revoke execute on function public.powerfarm_run_transition(uuid,text[],text,jsonb,jsonb,jsonb,jsonb) from public;
revoke execute on function public.powerfarm_effect_claim(uuid,text,text,text,text) from public;
revoke execute on function public.powerfarm_effect_complete(uuid,jsonb) from public;
revoke execute on function public.powerfarm_effect_uncertain(uuid,jsonb) from public;

grant execute on function public.powerfarm_session_create(text,text,text,text,text,jsonb,double precision) to authenticated;
grant execute on function public.powerfarm_session_get(text,text,integer,double precision) to authenticated;
grant execute on function public.powerfarm_session_list(text,integer,integer,text) to authenticated;
grant execute on function public.powerfarm_session_delete(text,text) to authenticated;
grant execute on function public.powerfarm_session_append_event(text,text,text,text,jsonb,double precision,jsonb) to authenticated;
grant execute on function public.powerfarm_run_create(text,text,text,text,text,text) to authenticated;
grant execute on function public.powerfarm_run_get(uuid) to authenticated;
grant execute on function public.powerfarm_run_transition(uuid,text[],text,jsonb,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.powerfarm_effect_claim(uuid,text,text,text,text) to authenticated;
grant execute on function public.powerfarm_effect_complete(uuid,jsonb) to authenticated;
grant execute on function public.powerfarm_effect_uncertain(uuid,jsonb) to authenticated;
