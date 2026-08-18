-- PowerFarm — identidade. Migration 01.
--
-- Quatro tabelas. Sem hash, sem act, sem gate.
--
-- O modelo e efemero; o cargo que ele ocupa e duravel, e e o cargo que assina.
-- Por isso identidade tem id estavel, e o ocupante entra por `occupancies`.
--
-- Regra desta base: nada escreve com a service key em runtime. So migrations.

-- ---------------------------------------------------------------- identities
-- person | office | app  -> tem chave, assina, dura.
-- Versao de modelo, engine e prompt NAO entram aqui: sao definicoes com hash.
create table public.identities (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('person','office','app')),
  name        text not null,
  mandate     text,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.identities(id),
  unique (kind, name)
);

-- -------------------------------------------------------------- identity_keys
-- "Esta chave e valida agora?" e a pergunta mais quente do sistema.
-- Timestamptz com indice, nao referencia a ledger nenhum.
create table public.identity_keys (
  id           uuid primary key default gen_random_uuid(),
  identity_id  uuid not null references public.identities(id) on delete cascade,
  pubkey       text not null,
  algorithm    text not null default 'ES256',
  label        text,
  valid_from   timestamptz not null default now(),
  valid_until  timestamptz,
  revoked_at   timestamptz,
  revoked_reason text,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.identities(id),
  unique (identity_id, pubkey)
);

create index identity_keys_ativas
  on public.identity_keys (pubkey)
  where revoked_at is null;

create index identity_keys_por_identidade
  on public.identity_keys (identity_id);

-- ---------------------------------------------------------------- occupancies
-- Quem estava na cadeira, e quando. O ocupante e uma definicao com hash
-- (versao de modelo). A tabela `definitions` chega na migration 03; ate la
-- isto guarda o hash sem chave estrangeira.
create table public.occupancies (
  id              uuid primary key default gen_random_uuid(),
  identity_id     uuid not null references public.identities(id) on delete cascade,
  definition_hash text not null,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.identities(id)
);

create index occupancies_por_identidade
  on public.occupancies (identity_id);

-- ------------------------------------------------------------- identity_links
-- A ponte para o Supabase Auth. Um utilizador, uma identidade.
create table public.identity_links (
  supabase_user uuid primary key references auth.users(id) on delete cascade,
  identity_id   uuid not null references public.identities(id) on delete cascade,
  linked_at     timestamptz not null default now(),
  unlinked_at   timestamptz
);

-- ------------------------------------------------------------------------ RLS
alter table public.identities     enable row level security;
alter table public.identity_keys  enable row level security;
alter table public.occupancies    enable row level security;
alter table public.identity_links enable row level security;

-- Leitura: quem esta autenticado ve quem existe. Nao ha segredo nisso.
create policy identities_leitura     on public.identities     for select to authenticated using (true);
create policy identity_keys_leitura  on public.identity_keys  for select to authenticated using (true);
create policy occupancies_leitura    on public.occupancies    for select to authenticated using (true);
create policy identity_links_leitura on public.identity_links for select to authenticated using (true);

-- Escrita: quem ja esta ligado a uma identidade pode escrever.
-- Na migration 04 isto passa a ler da `grants`. Ate la, e esta regra simples.
create or replace function public.eh_membro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.identity_links
    where supabase_user = auth.uid() and unlinked_at is null
  );
$$;

create policy identities_escrita    on public.identities    for insert to authenticated with check (public.eh_membro());
create policy identity_keys_escrita on public.identity_keys for insert to authenticated with check (public.eh_membro());
create policy identity_keys_revoga  on public.identity_keys for update to authenticated using (public.eh_membro());
create policy occupancies_escrita   on public.occupancies   for insert to authenticated with check (public.eh_membro());

-- Cada um liga a propria conta, e so a propria.
create policy identity_links_propria on public.identity_links
  for insert to authenticated with check (supabase_user = auth.uid());

-- -------------------------------------------------------------------- semente
-- O banco nasce com uma linha. Sem isto ninguem escreve nada: a policy exige
-- estar ligado a uma identidade, e nenhuma identidade existiria para ligar.
--
-- E o teu utilizador do Supabase Auth ligado ao teu cargo de pessoa.
insert into public.identities (kind, name, mandate)
values ('person', 'danvoulez', 'Assina por baixo. Aprova o trabalho dos cargos.')
on conflict (kind, name) do nothing;

insert into public.identity_links (supabase_user, identity_id)
select 'e9f02bf2-936a-4b73-b27e-4d53b6736c13', id
  from public.identities
 where kind = 'person' and name = 'danvoulez'
on conflict (supabase_user) do nothing;
