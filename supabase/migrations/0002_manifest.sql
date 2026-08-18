-- PowerFarm — manifesto. Migration 02.
--
-- O registry NAO e armazem. Ele nao guarda os bytes de nada: guarda a
-- declaracao de que a PowerFarm reconhece um artefacto exato, vindo de uma
-- fonte exata, numa versao exata. Os bytes ficam na fonte canonica.
--
-- Por isso nao ha coluna `content`. Ha `source_repo`, `source_commit`,
-- `source_path` e `sha256`. Quem quiser os bytes vai busca-los a fonte e
-- confere o hash. Cache e permitido; cache nunca vira proveniencia.

-- ------------------------------------------------------------------ artifacts
-- O que existe como coisa reconhecida. Id legivel e estavel: pf.brand.symbol.
-- Nao e hash, porque o artefacto sobrevive as suas versoes.
create table public.artifacts (
  id          text primary key check (id ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'),
  kind        text not null check (kind in ('brand','store','agent','policy','prompt','schema')),
  title       text not null,
  summary     text,
  publisher   uuid references public.identities(id),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.identities(id)
);

-- ---------------------------------------------------------- artifact_versions
-- Cada versao e imutavel e aponta para a fonte. A historia nunca se sobrescreve:
-- uma versao nova nao apaga a anterior, muda-lhe o estado.
create table public.artifact_versions (
  artifact_id    text not null references public.artifacts(id) on delete cascade,
  version        text not null,
  status         text not null default 'draft'
                 check (status in ('draft','experimental','approved',
                                   'deprecated','retained','retired')),
  source_repo    text,
  source_commit  text,
  source_path    text,
  sha256         text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  media_type     text,
  size_bytes     integer,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.identities(id),
  primary key (artifact_id, version)
);

create index artifact_versions_aprovadas
  on public.artifact_versions (artifact_id)
  where status = 'approved';

-- --------------------------------------------------------- artifact_relations
-- "De que depende isto?" e "o que e que isto substituiu?" sao duas das
-- perguntas que o registry existe para responder.
create table public.artifact_relations (
  from_artifact text not null references public.artifacts(id) on delete cascade,
  from_version  text not null,
  kind          text not null check (kind in ('depends_on','replaces','part_of')),
  to_artifact   text not null references public.artifacts(id),
  to_version    text,
  created_at    timestamptz not null default now(),
  primary key (from_artifact, from_version, kind, to_artifact)
);

-- ------------------------------------------------------------------------ RLS
alter table public.artifacts          enable row level security;
alter table public.artifact_versions  enable row level security;
alter table public.artifact_relations enable row level security;

create policy artifacts_leitura  on public.artifacts          for select to authenticated using (true);
create policy versions_leitura   on public.artifact_versions  for select to authenticated using (true);
create policy relacoes_leitura   on public.artifact_relations for select to authenticated using (true);

create policy artifacts_escrita  on public.artifacts          for insert to authenticated with check (public.eh_membro());
create policy versions_escrita   on public.artifact_versions  for insert to authenticated with check (public.eh_membro());
create policy versions_estado    on public.artifact_versions  for update to authenticated using (public.eh_membro());
create policy relacoes_escrita   on public.artifact_relations for insert to authenticated with check (public.eh_membro());

-- -------------------------------------------------------------------- semente
-- Os primeiros habitantes sao reais: os ficheiros de marca deste repositorio,
-- no commit 0041f482, com o sha256 dos bytes que la estao. Nao ha aqui nenhum
-- artefacto inventado para encher prateleira.
insert into public.artifacts (id, kind, title, summary, publisher, created_by)
select v.id, v.kind, v.title, v.summary, i.id, i.id
  from (values
    ('pf.brand.symbol',     'brand', 'Símbolo POWERFARM',
     'Símbolo primário da marca, variante creme.'),
    ('pf.brand.wordmark',   'brand', 'Wordmark POWERFARM',
     'Wordmark horizontal, usado no cabeçalho da Identity.'),
    ('pf.brand.colors',     'brand', 'Tokens de cor',
     'Paleta canónica com o papel declarado de cada cor.'),
    ('pf.brand.tokens.css', 'brand', 'Tokens em CSS',
     'Cor e tipografia como variáveis CSS, prontas a importar.')
  ) as v(id, kind, title, summary)
  cross join (select id from public.identities where kind='person' and name='danvoulez') i
on conflict (id) do nothing;

insert into public.artifact_versions
  (artifact_id, version, status, source_repo, source_commit, source_path,
   sha256, media_type, size_bytes, notes, created_by)
select v.*, i.id
  from (values
    ('pf.brand.symbol', '0.2', 'approved',
     'powerfarm/powerfarm-registry', '0041f48284ff3326c8f5fc7e5791b83e838af610',
     'public/symbol.svg',
     'ed68b526de01cbabdddc15390a1db41314f2f9ea780cd15c229881732224a2f8',
     'image/svg+xml', 822,
     'Traçado a partir do raster de referência. O SOURCE-STATUS.md do pacote de marca avisa: substituir pelo vetor do designer antes de uso crítico para marca registada ou fabrico.'),
    ('pf.brand.wordmark', '0.2', 'approved',
     'powerfarm/powerfarm-registry', '0041f48284ff3326c8f5fc7e5791b83e838af610',
     'public/wordmark.svg',
     '85ba16db767e9bd3731921ebaa3f1ddbbe61cbfc277458ed066f6aa0e248e2f2',
     'image/svg+xml', 3050,
     'Mesma ressalva de origem do símbolo.'),
    ('pf.brand.colors', '0.2', 'approved',
     'powerfarm/powerfarm-registry', '0041f48284ff3326c8f5fc7e5791b83e838af610',
     'app/brand-colors.json',
     'b66ca093ea144e39a676596c73395ac89eadd6c060af8bee8059482fce3ba661',
     'application/json', 1115,
     'Copiado do pacote de marca sem reescrita.'),
    ('pf.brand.tokens.css', '0.2', 'approved',
     'powerfarm/powerfarm-registry', '0041f48284ff3326c8f5fc7e5791b83e838af610',
     'app/brand.css',
     '304ad000b1bace4ed79e68696d58ed706fa3db81a4a80f2d546211f694474af8',
     'text/css', 1257,
     'Concatenação do color e do typography do pacote.')
  ) as v(artifact_id, version, status, source_repo, source_commit, source_path,
         sha256, media_type, size_bytes, notes)
  cross join (select id from public.identities where kind='person' and name='danvoulez') i
on conflict (artifact_id, version) do nothing;

insert into public.artifact_relations (from_artifact, from_version, kind, to_artifact, to_version)
values ('pf.brand.tokens.css', '0.2', 'depends_on', 'pf.brand.colors', '0.2')
on conflict do nothing;
