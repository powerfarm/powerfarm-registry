-- PowerFarm — autoridade e prova. Migration 03.
--
-- As duas migrations anteriores registam o que as coisas SAO. Esta regista o
-- que ACONTECE, e quem responde por isso.
--
-- grants   o mandato do cargo. Sem ele a assinatura nao atesta nada.
-- runs     a cadeia de custodia: que cargo, que ocupante, que definicoes, que saida.
-- approvals a contra-assinatura humana.
--
-- Disciplina: aprovacao e facto registado, nao processo orquestrado. Quem espera
-- e o motor de grafo; aqui so fica escrito que foi aprovado, por quem e quando.

-- --------------------------------------------------------------------- grants
-- Regra vira dado. Validade e timestamp, nunca referencia a ledger.
create table public.grants (
  id            uuid primary key default gen_random_uuid(),
  identity_id   uuid not null references public.identities(id) on delete cascade,
  action        text not null,
  resource      text,
  granted_by    uuid not null references public.identities(id),
  valid_from    timestamptz not null default now(),
  valid_until   timestamptz,
  revoked_at    timestamptz,
  revoked_reason text,
  created_at    timestamptz not null default now()
);

create index grants_vigentes on public.grants (identity_id, action)
  where revoked_at is null;

-- "Este cargo pode isto agora?" — uma pergunta, um SELECT.
create or replace function public.pode(p_identity uuid, p_action text)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.grants
     where identity_id = p_identity
       and action = p_action
       and revoked_at is null
       and valid_from <= now()
       and (valid_until is null or valid_until > now())
  );
$$;

-- ----------------------------------------------------------------------- runs
-- Quem assinou e quem executou sao colunas diferentes, de proposito: o cargo e
-- duravel, o ocupante e efemero. `engine_ref` aponta para a sessao do motor de
-- grafo quando houver — nao duplicamos os eventos dele aqui.
create table public.runs (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references public.identities(id),
  occupancy_id    uuid references public.occupancies(id),
  intent          text not null,
  engine          text,
  engine_ref      text,
  status          text not null default 'running'
                  check (status in ('running','succeeded','failed','cancelled')),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_by      uuid references public.identities(id)
);

create index runs_por_cargo on public.runs (office_id, started_at desc);

-- O que o run consumiu e produziu, por hash. Sem bytes: so a referencia.
-- Postgres nao aceita expressao em primary key, entao a chave e sintetica e a
-- unicidade real vive num indice.
create table public.run_artifacts (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.runs(id) on delete cascade,
  direction    text not null check (direction in ('input','output')),
  artifact_id  text references public.artifacts(id),
  version      text,
  sha256       text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  label        text
);

create unique index run_artifacts_unico on public.run_artifacts
  (run_id, direction, coalesce(artifact_id, ''), coalesce(sha256, ''));

create index run_artifacts_por_run on public.run_artifacts (run_id);

-- ------------------------------------------------------------------ approvals
-- Append-only. Uma aprovacao nunca se apaga; revoga-se com outra linha.
create table public.approvals (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid references public.runs(id) on delete cascade,
  artifact_id  text references public.artifacts(id),
  version      text,
  subject_sha  text check (subject_sha is null or subject_sha ~ '^[0-9a-f]{64}$'),
  approver_id  uuid not null references public.identities(id),
  key_id       uuid references public.identity_keys(id),
  signature    text,
  decision     text not null default 'approved'
               check (decision in ('approved','rejected','revoked')),
  note         text,
  approved_at  timestamptz not null default now(),
  constraint approvals_tem_assunto
    check (run_id is not null or artifact_id is not null or subject_sha is not null)
);

create index approvals_por_run on public.approvals (run_id);

-- ------------------------------------------------------------------------ RLS
alter table public.grants        enable row level security;
alter table public.runs          enable row level security;
alter table public.run_artifacts enable row level security;
alter table public.approvals     enable row level security;

create policy grants_leitura    on public.grants        for select to authenticated using (true);
create policy runs_leitura      on public.runs          for select to authenticated using (true);
create policy run_art_leitura   on public.run_artifacts for select to authenticated using (true);
create policy approvals_leitura on public.approvals     for select to authenticated using (true);

create policy grants_escrita    on public.grants        for insert to authenticated with check (public.eh_membro());
create policy grants_revoga     on public.grants        for update to authenticated using (public.eh_membro());
create policy runs_escrita      on public.runs          for insert to authenticated with check (public.eh_membro());
create policy runs_fecha        on public.runs          for update to authenticated using (public.eh_membro());
create policy run_art_escrita   on public.run_artifacts for insert to authenticated with check (public.eh_membro());
create policy approvals_escrita on public.approvals     for insert to authenticated with check (public.eh_membro());
