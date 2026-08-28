-- PowerFarm — admitir Brand System v0.3 e o Login Kit.
--
-- Nao e a migration 03 de blobs. Essa continua adiada: estes bytes vivem
-- no pacote de marca e no ficheiro do kit. O registry so declara.
--
-- Versao 20260828170000: 0004 ja pertence a adk_runtime no banco vivo.
-- Esta migration ainda nao foi aplicada e por isso avanca sem reescrever historia.
--
-- Versao nova nao apaga a anterior. 0.2 passa a retained.
-- Hashes sao dos bytes lidos neste disco, 2026-08-19.
-- Sem commit git do pacote de marca: source_commit fica null. Nao se inventa.

-- ----------------------------------------------------------------- reter 0.2
update public.artifact_versions
   set status = 'retained'
 where artifact_id in (
   'pf.brand.symbol',
   'pf.brand.wordmark',
   'pf.brand.colors',
   'pf.brand.tokens.css'
 )
   and version = '0.2'
   and status = 'approved';

-- -------------------------------------------------------------- brand v0.3
insert into public.artifact_versions
  (artifact_id, version, status, source_repo, source_commit, source_path,
   sha256, media_type, size_bytes, notes, created_by)
select v.*, i.id
  from (values
    ('pf.brand.symbol', '0.3', 'approved',
     'POWERFARM-Brand-System', null,
     'logo/powerfarm-symbol-cream.svg',
     'd9b9ab71b623c2b1ea55adce55229fdcec991a9d0283c016902565f8055c4c2d',
     'image/svg+xml', 800,
     'Pacote Brand System v0.3. Traçado do raster. SOURCE-STATUS.md: substituir pelo vetor do designer antes de uso crítico.'),
    ('pf.brand.wordmark', '0.3', 'approved',
     'POWERFARM-Brand-System', null,
     'logo/powerfarm-wordmark-master.svg',
     '7cb782330d09612eb5483be6236a24aab3f65817fcb9fd94fae37e5b63342824',
     'image/svg+xml', 3044,
     'Pacote Brand System v0.3. Mesma ressalva de origem do símbolo.'),
    ('pf.brand.colors', '0.3', 'approved',
     'POWERFARM-Brand-System', null,
     'color/powerfarm-color-tokens.json',
     '4bdc8a8a34389bf06bbae353cce65e2cfa803c7db7e2b481012f23e70ae08d0e',
     'application/json', 3563,
     'v0.3: Amber Deep #A96600 e tabela de contraste. Energy Amber nao se usa sobre cream.'),
    ('pf.brand.tokens.css', '0.3', 'approved',
     'POWERFARM-Brand-System', null,
     'color/powerfarm-colors.css + typography/powerfarm-typography.css',
     '471dfa4351e3c2c08dfe6b7a7002493a9dc92d0fb007978f9f0b14372f3dc419',
     'text/css', 2783,
     'Concatenação na mesma ordem que o 0.2: cores, depois tipografia. font-synthesis: none.')
  ) as v(artifact_id, version, status, source_repo, source_commit, source_path,
         sha256, media_type, size_bytes, notes)
  cross join (select id from public.identities where kind='person' and name='danvoulez') i
on conflict (artifact_id, version) do nothing;

insert into public.artifact_relations (from_artifact, from_version, kind, to_artifact, to_version)
values ('pf.brand.tokens.css', '0.3', 'depends_on', 'pf.brand.colors', '0.3')
on conflict do nothing;

-- -------------------------------------------------------------- login kit
-- O kit ja existe: ui/auth/PowerFarmLogin.tsx. Nao conhece o Registry.
-- kind=store: e a prateleira de componentes. install fica null.
insert into public.artifacts (id, kind, title, summary, publisher, created_by)
select 'pf.ui.auth.login', 'store', 'Login Kit POWERFARM',
       'Bloco canónico de entrada. Nao importa Supabase. Nao sabe o callback. O Registry e o primeiro consumidor.',
       i.id, i.id
  from (select id from public.identities where kind='person' and name='danvoulez') i
on conflict (id) do nothing;

insert into public.artifact_versions
  (artifact_id, version, status, source_repo, source_commit, source_path,
   sha256, media_type, size_bytes, notes, created_by)
select 'pf.ui.auth.login', '0.1', 'experimental',
       'powerfarm/powerfarm-registry', null,
       'ui/auth/PowerFarmLogin.tsx',
       '36101fc05dd55d8752cd5879d9ff4e5a5cf245f06f9b669cd1f034d5dc58b974',
       'text/tsx', 3762,
       'install: null. Sem distribuicao ainda. Status sobe a approved quando houver comando real.',
       i.id
  from (select id from public.identities where kind='person' and name='danvoulez') i
on conflict (artifact_id, version) do nothing;
