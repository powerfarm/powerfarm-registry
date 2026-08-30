-- PowerFarm Registry -- Store/Gadget lineage.
--
-- Version note. On the live powerfarm project version 20260820192536 is already
-- applied as 20260820192536_gadget_lineage, so this file is skipped there. That
-- is safe: the Store tables it creates already exist on that database from the
-- earlier migration. This file is the fresh-install shape, without the
-- Process-owned execution grants that the original carried. The number cannot move,
-- because the Store must exist before later migrations reference it.
--
-- Registry owns durable identity, brand, artifacts and the Store catalog.
-- Workspace roles below are Registry-local product ACLs. They are NOT
-- institutional PowerFarm Authority. Grants, runs, admission and consequence
-- are owned by PowerFarm Process in the Super Bundle (Continuum + pinned engine Settings).


create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z][a-z0-9-]{1,62}$'),
  title       text not null,
  created_by  uuid not null references public.identities(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  identity_id  uuid not null references public.identities(id) on delete cascade,
  role         text not null check (role in ('owner','editor','operator','viewer')),
  created_by   uuid not null references public.identities(id),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, identity_id)
);

create table public.gadgets (
  id                text primary key check (id ~ '^[a-z][a-z0-9-]{1,62}$'),
  workspace_id      uuid not null references public.workspaces(id),
  title             text not null,
  current_revision  bigint,
  created_by        uuid not null references public.identities(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.gadget_drafts (
  gadget_id          text primary key references public.gadgets(id) on delete cascade,
  draft_revision     bigint not null default 1 check (draft_revision > 0),
  published_revision bigint,
  authored_state     jsonb not null check (jsonb_typeof(authored_state) = 'object'),
  content_hash       text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  updated_by         uuid not null references public.identities(id),
  updated_at         timestamptz not null default now()
);

create table public.gadget_draft_operations (
  gadget_id            text not null references public.gadgets(id) on delete cascade,
  client_operation_id  text not null check (length(client_operation_id) between 1 and 200),
  base_revision        bigint not null,
  resulting_revision   bigint not null,
  patch                 jsonb not null check (jsonb_typeof(patch) = 'object'),
  applied_by            uuid not null references public.identities(id),
  applied_at            timestamptz not null default now(),
  primary key (gadget_id, client_operation_id)
);

create table public.gadget_revisions (
  id              uuid primary key default gen_random_uuid(),
  gadget_id       text not null references public.gadgets(id),
  revision        bigint not null check (revision > 0),
  version         text not null,
  content_hash    text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  definition_hash text not null check (definition_hash ~ '^[0-9a-f]{64}$'),
  authored_state  jsonb not null check (jsonb_typeof(authored_state) = 'object'),
  published_by    uuid not null references public.identities(id),
  published_at    timestamptz not null default now(),
  unique (gadget_id, revision),
  unique (gadget_id, content_hash)
);

alter table public.gadgets
  add constraint gadgets_current_revision_fk
  foreign key (id, current_revision)
  references public.gadget_revisions(gadget_id, revision)
  deferrable initially deferred;

alter table public.gadget_drafts
  add constraint gadget_drafts_published_revision_fk
  foreign key (gadget_id, published_revision)
  references public.gadget_revisions(gadget_id, revision)
  deferrable initially deferred;

create table public.gadget_installations (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  gadget_id     text not null,
  revision      bigint not null,
  status        text not null default 'installed'
                check (status in ('installed','uninstalled')),
  auto_update   boolean not null default true,
  installed_by  uuid not null references public.identities(id),
  installed_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (workspace_id, gadget_id),
  foreign key (gadget_id, revision)
    references public.gadget_revisions(gadget_id, revision)
);


create index gadget_revisions_history on public.gadget_revisions (gadget_id, revision desc);

create or replace function public.powerfarm_workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.workspace_members
   where workspace_id = p_workspace_id
     and identity_id = public.identidade_atual();
$$;

revoke execute on function public.powerfarm_workspace_role(uuid) from public;
grant execute on function public.powerfarm_workspace_role(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.gadgets enable row level security;
alter table public.gadget_drafts enable row level security;
alter table public.gadget_draft_operations enable row level security;
alter table public.gadget_revisions enable row level security;
alter table public.gadget_installations enable row level security;

-- Runtime mutations cross the RPC contracts below. Table access is read-only;
-- this prevents callers from bypassing optimistic concurrency, immutable
-- publishing, installation resolution, or RunGrant issuance through PostgREST.
grant select on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.gadgets to authenticated;
grant select on public.gadget_drafts to authenticated;
grant select on public.gadget_draft_operations to authenticated;
grant select on public.gadget_revisions to authenticated;
grant select on public.gadget_installations to authenticated;

create policy workspaces_read on public.workspaces for select to authenticated
  using (public.powerfarm_workspace_role(id) is not null);
create policy workspaces_create on public.workspaces for insert to authenticated
  with check (created_by = public.identidade_atual());
create policy workspaces_edit on public.workspaces for update to authenticated
  using (public.powerfarm_workspace_role(id) = 'owner')
  with check (public.powerfarm_workspace_role(id) = 'owner');

create policy workspace_members_read on public.workspace_members for select to authenticated
  using (public.powerfarm_workspace_role(workspace_id) is not null);
create policy workspace_members_create on public.workspace_members for insert to authenticated
  with check (public.powerfarm_workspace_role(workspace_id) = 'owner');
create policy workspace_members_edit on public.workspace_members for update to authenticated
  using (public.powerfarm_workspace_role(workspace_id) = 'owner')
  with check (public.powerfarm_workspace_role(workspace_id) = 'owner');

create policy gadgets_read on public.gadgets for select to authenticated
  using (public.powerfarm_workspace_role(workspace_id) is not null);
create policy gadgets_create on public.gadgets for insert to authenticated
  with check (
    created_by = public.identidade_atual()
    and public.powerfarm_workspace_role(workspace_id) in ('owner','editor')
  );
create policy gadgets_edit on public.gadgets for update to authenticated
  using (public.powerfarm_workspace_role(workspace_id) in ('owner','editor'))
  with check (public.powerfarm_workspace_role(workspace_id) in ('owner','editor'));

create policy gadget_drafts_read on public.gadget_drafts for select to authenticated
  using (exists (select 1 from public.gadgets g where g.id = gadget_id));
create policy gadget_drafts_write on public.gadget_drafts for all to authenticated
  using (exists (
    select 1 from public.gadgets g where g.id = gadget_id
      and public.powerfarm_workspace_role(g.workspace_id) in ('owner','editor')
  ))
  with check (updated_by = public.identidade_atual() and exists (
    select 1 from public.gadgets g where g.id = gadget_id
      and public.powerfarm_workspace_role(g.workspace_id) in ('owner','editor')
  ));

create policy gadget_draft_operations_read on public.gadget_draft_operations
  for select to authenticated using (exists (
    select 1 from public.gadgets g where g.id = gadget_id
  ));
create policy gadget_draft_operations_write on public.gadget_draft_operations
  for insert to authenticated with check (
    applied_by = public.identidade_atual() and exists (
      select 1 from public.gadgets g where g.id = gadget_id
        and public.powerfarm_workspace_role(g.workspace_id) in ('owner','editor')
    )
  );

create policy gadget_revisions_read on public.gadget_revisions for select to authenticated
  using (exists (select 1 from public.gadgets g where g.id = gadget_id));
create policy gadget_revisions_publish on public.gadget_revisions for insert to authenticated
  with check (published_by = public.identidade_atual() and exists (
    select 1 from public.gadgets g where g.id = gadget_id
      and public.powerfarm_workspace_role(g.workspace_id) in ('owner','editor')
  ));

create policy gadget_installations_read on public.gadget_installations for select to authenticated
  using (public.powerfarm_workspace_role(workspace_id) is not null);
create policy gadget_installations_write on public.gadget_installations for all to authenticated
  using (public.powerfarm_workspace_role(workspace_id) in ('owner','editor'))
  with check (
    installed_by = public.identidade_atual()
    and public.powerfarm_workspace_role(workspace_id) in ('owner','editor')
  );


create or replace function public.powerfarm_identity_context()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'principal_ref', public.identidade_atual(),
    'workspaces', coalesce(jsonb_agg(jsonb_build_object(
      'workspace_ref', w.id, 'slug', w.slug, 'title', w.title, 'role', m.role
    ) order by w.slug) filter (where w.id is not null), '[]'::jsonb)
  )
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.identity_id = public.identidade_atual();
$$;

create or replace function public.powerfarm_gadget_get_draft(p_gadget_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select to_jsonb(d) from public.gadget_drafts d where d.gadget_id = p_gadget_id;
$$;

create or replace function public.powerfarm_gadget_apply_patch(
  p_gadget_id text,
  p_base_revision bigint,
  p_patch jsonb,
  p_client_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := public.identidade_atual();
  v_draft public.gadget_drafts%rowtype;
  v_op public.gadget_draft_operations%rowtype;
  v_state jsonb;
begin
  if v_user is null then raise exception 'Powerfarm identity link required'; end if;
  if not exists (
    select 1 from public.gadgets g where g.id = p_gadget_id
      and public.powerfarm_workspace_role(g.workspace_id) in ('owner','editor')
  ) then raise exception 'gadget_edit_denied'; end if;
  if jsonb_typeof(p_patch) <> 'object' then raise exception 'Patch must be an object'; end if;
  if nullif(btrim(p_client_operation_id), '') is null then
    raise exception 'Client operation id is required';
  end if;

  select * into v_op from public.gadget_draft_operations
   where gadget_id = p_gadget_id and client_operation_id = p_client_operation_id;
  if found then
    if v_op.base_revision <> p_base_revision or v_op.patch <> p_patch then
      raise exception 'client_operation_conflict';
    end if;
    select * into strict v_draft from public.gadget_drafts where gadget_id = p_gadget_id;
    return to_jsonb(v_draft);
  end if;

  select * into v_draft from public.gadget_drafts
   where gadget_id = p_gadget_id for update;
  if not found then raise exception 'gadget_not_found'; end if;
  if v_draft.draft_revision <> p_base_revision then raise exception 'revision_conflict'; end if;

  v_state := v_draft.authored_state || p_patch;
  update public.gadget_drafts
     set draft_revision = draft_revision + 1,
         authored_state = v_state,
         content_hash = encode(extensions.digest(convert_to(v_state::text, 'UTF8'), 'sha256'), 'hex'),
         updated_by = v_user,
         updated_at = now()
   where gadget_id = p_gadget_id
  returning * into strict v_draft;

  insert into public.gadget_draft_operations (
    gadget_id, client_operation_id, base_revision, resulting_revision, patch, applied_by
  ) values (
    p_gadget_id, p_client_operation_id, p_base_revision,
    v_draft.draft_revision, p_patch, v_user
  );
  return to_jsonb(v_draft);
end;
$$;

create or replace function public.powerfarm_gadget_publish(
  p_gadget_id text,
  p_base_revision bigint,
  p_definition_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := public.identidade_atual();
  v_draft public.gadget_drafts%rowtype;
  v_revision public.gadget_revisions%rowtype;
  v_next bigint;
  v_version text;
begin
  if v_user is null or not exists (
    select 1 from public.gadgets g where g.id = p_gadget_id
      and public.powerfarm_workspace_role(g.workspace_id) in ('owner','editor')
  ) then raise exception 'gadget_publish_denied'; end if;
  select * into v_draft from public.gadget_drafts
   where gadget_id = p_gadget_id for update;
  if not found then raise exception 'gadget_not_found'; end if;
  if v_draft.draft_revision <> p_base_revision then raise exception 'revision_conflict'; end if;
  if p_definition_hash !~ '^[0-9a-f]{64}$' then raise exception 'definition_hash_required'; end if;
  if jsonb_typeof(v_draft.authored_state->'capabilities') <> 'object'
     or v_draft.authored_state->'capabilities' = '{}'::jsonb then
    raise exception 'capability_contract_required';
  end if;

  select * into v_revision from public.gadget_revisions
   where gadget_id = p_gadget_id and content_hash = v_draft.content_hash;
  if found then return to_jsonb(v_revision); end if;

  select coalesce(max(revision), 0) + 1 into v_next
    from public.gadget_revisions where gadget_id = p_gadget_id;
  v_version := coalesce(nullif(v_draft.authored_state->>'version', ''), '0.1.' || (v_next - 1));
  insert into public.gadget_revisions (
    gadget_id, revision, version, content_hash, definition_hash, authored_state, published_by
  ) values (
    p_gadget_id, v_next, v_version, v_draft.content_hash, p_definition_hash,
    v_draft.authored_state, v_user
  ) returning * into strict v_revision;

  update public.gadgets set current_revision = v_next, updated_at = now()
   where id = p_gadget_id;
  update public.gadget_drafts set published_revision = v_next
   where gadget_id = p_gadget_id;
  update public.gadget_installations
     set revision = v_next, updated_at = now()
   where gadget_id = p_gadget_id and status = 'installed' and auto_update;
  return to_jsonb(v_revision);
end;
$$;

create or replace function public.powerfarm_gadget_get_revision(
  p_gadget_id text,
  p_revision bigint
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select to_jsonb(r) from public.gadget_revisions r
   where r.gadget_id = p_gadget_id and r.revision = p_revision;
$$;

create or replace function public.powerfarm_resolve_capability(
  p_workspace_ref uuid,
  p_capability_ref text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_principal uuid := public.identidade_atual();
  v_result jsonb;
begin
  if v_principal is null then raise exception 'Powerfarm identity link required'; end if;
  if public.powerfarm_workspace_role(p_workspace_ref) is null then
    raise exception 'workspace_access_denied';
  end if;

  select jsonb_build_object(
    'contract_version', 'powerfarm.registry.capability-resolution/v1',
    'workspace_ref', i.workspace_id,
    'capability_ref', p_capability_ref,
    'gadget_ref', i.gadget_id,
    'gadget_revision', r.revision,
    'gadget_revision_hash', r.content_hash,
    'gadget_definition_hash', r.definition_hash,
    'operation', r.authored_state->'capabilities'->p_capability_ref->>'operation',
    'required_capabilities', coalesce(
      r.authored_state->'capabilities'->p_capability_ref->'required_capabilities', '[]'::jsonb
    ),
    'resolved_at', now()
  ) into v_result
  from public.gadget_installations i
  join public.gadget_revisions r
    on r.gadget_id = i.gadget_id and r.revision = i.revision
  where i.workspace_id = p_workspace_ref
    and i.status = 'installed'
    and r.authored_state->'capabilities' ? p_capability_ref;

  if v_result is null then raise exception 'capability_not_installed'; end if;
  if nullif(v_result->>'operation', '') is null then raise exception 'operation_not_declared'; end if;
  return v_result;
end;
$$;

revoke execute on function public.powerfarm_identity_context() from public;
revoke execute on function public.powerfarm_gadget_get_draft(text) from public;
revoke execute on function public.powerfarm_gadget_apply_patch(text,bigint,jsonb,text) from public;
revoke execute on function public.powerfarm_gadget_publish(text,bigint,text) from public;
revoke execute on function public.powerfarm_gadget_get_revision(text,bigint) from public;
revoke execute on function public.powerfarm_resolve_capability(uuid,text) from public;

grant execute on function public.powerfarm_identity_context() to authenticated;
grant execute on function public.powerfarm_gadget_get_draft(text) to authenticated;
grant execute on function public.powerfarm_gadget_apply_patch(text,bigint,jsonb,text) to authenticated;
grant execute on function public.powerfarm_gadget_publish(text,bigint,text) to authenticated;
grant execute on function public.powerfarm_gadget_get_revision(text,bigint) to authenticated;
grant execute on function public.powerfarm_resolve_capability(uuid,text) to authenticated;


do $$
declare
  v_owner uuid;
  v_workspace constant uuid := '00000000-0000-4000-8000-000000000001';
  v_state jsonb;
  v_hash text;
begin
  select id into strict v_owner from public.identities
   where kind = 'person' and name = 'danvoulez';

  insert into public.workspaces (id, slug, title, created_by)
  values (v_workspace, 'danvoulez', 'Dan Voullez', v_owner)
  on conflict (id) do nothing;
  insert into public.workspace_members (workspace_id, identity_id, role, created_by)
  values (v_workspace, v_owner, 'owner', v_owner)
  on conflict (workspace_id, identity_id) do nothing;

  v_state := jsonb_build_object(
    'version', '0.1.0',
    'files', jsonb_build_object('gadget.yaml', $gadget$
apiVersion: powerfarm.app/v1alpha1
kind: Gadget
metadata:
  id: hello-agentic
  version: 0.1.0
spec:
  agentic:
    runtime: adk-js
  agents:
    assistant:
      model:
        capability: model
      instruction: >
        Help the user complete the task. If essential information is missing,
        use adk_request_input once and continue after the user responds.
      capabilities:
        - model
        - input
  flows:
    default:
      sequence:
        - agent: assistant
  capabilities:
    model:
      kind: model
      target: workers-ai
    input:
      kind: input
      target: user
$gadget$),
    'capabilities', jsonb_build_object(
      'hello.run', jsonb_build_object(
        'operation', 'run',
        'description', 'Ask for a name and return HELLO followed by that name.',
        'input_schema', jsonb_build_object('type', 'object'),
        'required_capabilities', jsonb_build_array('model', 'input')
      )
    )
  );
  v_hash := encode(extensions.digest(convert_to(v_state::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.gadgets (id, workspace_id, title, current_revision, created_by)
  values ('hello-agentic', v_workspace, 'Hello Agentic', null, v_owner)
  on conflict (id) do nothing;
  insert into public.gadget_drafts (
    gadget_id, draft_revision, authored_state, content_hash, updated_by
  ) values ('hello-agentic', 1, v_state, v_hash, v_owner)
  on conflict (gadget_id) do nothing;
  insert into public.gadget_revisions (
    gadget_id, revision, version, content_hash, definition_hash, authored_state, published_by
  ) values (
    'hello-agentic', 1, '0.1.0', v_hash,
    'afd21b6e2a15acf76a0d73bc2f9c599ac44a211d16df2f712592a777261429a0',
    v_state, v_owner
  )
  on conflict (gadget_id, revision) do nothing;
  update public.gadgets set current_revision = 1 where id = 'hello-agentic';
  update public.gadget_drafts set published_revision = 1 where gadget_id = 'hello-agentic';
  insert into public.gadget_installations (
    workspace_id, gadget_id, revision, installed_by
  ) values (v_workspace, 'hello-agentic', 1, v_owner)
  on conflict (workspace_id, gadget_id) do nothing;
end;
$$;
