# Superstructure canônica, Powerfarm Identity e Registry vivo

**Status:** proposta aprovada para especificação; implementação ainda não autorizada

**Data:** 2026-08-28

**Escopo:** publicação da Superstructure, login canônico, onboarding OAuth 2.1 de aplicações, área autenticada/administrativa do Registry e Store com artefatos vivos

## 1. Decisão

A Powerfarm terá uma única Superstructure canônica para marca, tokens, primitivas de UI, patterns, kits, contratos de build e manifesto de artefatos.

O Registry continuará sendo um frontend online e independente. Ele tem duas responsabilidades próprias e permanentes:

1. registrar entidades Powerfarm e suas relações de identidade;
2. operar a Powerfarm Identity sobre o Supabase Auth OAuth 2.1.

O Registry também projeta a Store, mas não se torna a fonte dos artefatos. A Store apresenta e admite versões exatas produzidas pela Superstructure.

Aplicações externas não são reescritas nem governadas internamente pela Powerfarm. Elas fazem onboarding como clientes OAuth, redirecionam o utilizador para a Powerfarm Identity e recebem uma identidade Powerfarm. Depois do callback, cada aplicação mantém sua própria sessão, regras, dados e ferramentas.

## 2. Vocabulário

### 2.1 Autoridade humana e cânone técnico

- O Diretor decide o sistema e suas mudanças.
- A Superstructure é o cânone técnico compartilhado.
- O Registry registra entidades, clientes, admissões e relações operacionais.
- O Supabase Auth emite e administra credenciais OAuth 2.1.
- Uma aplicação externa continua sendo responsável por sua lógica interna.

### 2.2 Entidades

O Registry conserva as entidades existentes:

- `person`: pessoa durável;
- `office`: cargo durável que pode receber mandato;
- `app`: aplicação reconhecida pela Powerfarm.

Uma entidade `app` não é a mesma coisa que um cliente OAuth:

- a entidade responde **qual aplicação existe**;
- o `client_id` responde **qual instalação/ambiente pede autorização**;
- o `sub` do token responde **qual pessoa entrou na aplicação**.

Uma aplicação pode possuir mais de um cliente OAuth, por exemplo produção, staging e aplicativo nativo.

### 2.3 Artefatos

Um artefato admitido possui identidade estável e versões imutáveis. Seu conteúdo continua na fonte canônica; o Registry guarda proveniência, estado e relações.

Para uma versão renderizável, existem dois endereços distintos:

- **source URL:** caminho GitHub fixado ao commit;
- **live URL:** build versionado e acessível no Vercel.

O source prova a origem. O live URL permite ver e experimentar a peça.

## 3. Invariantes

1. Não existe formulário de login Powerfarm copiado para cada aplicação.
2. Todo login de uma aplicação onboarded começa pelo OAuth 2.1 da Powerfarm Identity.
3. A página operacional única de login é `https://registry.powerfarm.app/login`.
4. O consentimento OAuth permanece no Registry e preserva o `authorization_id` durante login e retorno.
5. O Login Kit canônico vive na Superstructure; o Registry fornece somente o adapter Supabase.
6. Login é a UI obrigatória do onboarding OAuth. Onboarding, Install, Uninstall, Alerts, Notifications e CI/CD são kits opcionais.
7. Cliente confidencial recebe secret uma única vez. Cliente público não recebe secret e usa Authorization Code com PKCE.
8. Nenhum client secret é persistido nas tabelas públicas do Registry, em logs ou no manifesto.
9. A criação e administração de clientes OAuth exige grant administrativo verificado no servidor e no banco.
10. O Registry não duplica `auth.oauth_clients`; guarda apenas a relação entre a entidade `app`, o cliente administrado pelo Supabase e quem realizou o onboarding.
11. A Store não publica artefato apenas porque ele existe no GitHub. A versão precisa ser construída, verificada, localizada por hash e admitida.
12. URLs de source e preview são explícitas e canônicas; nunca são derivadas de host de preview ou do request corrente.
13. Processos permanecem no Neon e não entram no Supabase oficial da Powerfarm.
14. Nenhuma nova função do Registry depende das tabelas de Cloudflare OS ou do runtime ADK atualmente acopladas ao Supabase.
15. Migrations aplicadas nunca são renumeradas ou reescritas. Correções são forward-only.

## 4. Arquitetura

```text
SUPERSTRUCTURE — GitHub canônico
├── brand
├── ui-core
├── ui
├── patterns
├── kits
│   ├── login           obrigatório para apps OAuth
│   ├── onboarding      opcional
│   ├── install         opcional
│   ├── uninstall       opcional
│   ├── notifications   opcional
│   ├── alerts          opcional
│   └── ci-cd           opcional
├── hosts de referência
├── catálogo
└── release manifest
       │
       ├── tarballs versionados
       ├── hashes e provenance
       └── previews vivos
                │
                ▼
      ui.powerfarm.app
      galeria e previews opcionais

REGISTRY — Vercel existente
├── /login
├── /oauth/consent
├── /account
├── /admin
│   ├── apps OAuth
│   ├── entidades
│   ├── grants
│   └── admissões da Store
└── /store
       │
       ▼
SUPABASE POWERFARM
├── Auth OAuth 2.1
├── entidades e chaves
├── relação app ↔ cliente OAuth
└── admissões de artefatos

APP EXTERNO
├── inicia OAuth
├── recebe callback
├── valida token/JWKS
└── cria sua própria sessão
```

## 5. Publicação da Superstructure

### 5.1 Repositório canônico

A pasta local `POWERFARM-Superstructure-v0.1.0` será publicada no repositório dedicado `powerfarm/powerfarm-superstructure`. A importação inicial deve preservar o conteúdo recebido e produzir um primeiro commit identificável antes de qualquer reorganização.

Arquivos gerados não se tornam fonte. O repositório mantém os sources, contratos e scripts; releases carregam os outputs construídos.

### 5.2 Contrato do catálogo

O catálogo passa a distinguir:

- `required`: Login Kit para aplicações que fazem onboarding OAuth;
- `optional`: demais kits;
- `referenceHost`: aplicação demonstrativa da Superstructure;
- `operationalHost`: host real que conecta um adapter e executa o fluxo;
- `preview`: build interativo sem efeitos externos.

`enabled: true` não significa que uma superfície deve receber um projeto Vercel próprio. Significa somente que o artefato participa da release.

### 5.3 Release executável

Cada release produz:

- tag Git;
- commit canônico;
- tarballs dos packages compartilhados;
- bundles dos hosts de referência;
- hashes SHA-256;
- manifesto de artefatos;
- previews versionados;
- recibos de catalog validation, Brand Guard, build e smoke checks.

Os tarballs da GitHub Release são o canal de distribuição inicial. O Registry fixa a URL e o hash do tarball no lockfile. Um registry npm pode ser adicionado como espelho posteriormente sem mudar o contrato canônico.

### 5.4 Manifesto de release

Cada entrada do manifesto contém, no mínimo:

```json
{
  "artifactId": "pf.ui.auth.login",
  "version": "0.1.0",
  "kind": "ui-kit",
  "adoption": "required",
  "source": {
    "repo": "powerfarm/powerfarm-superstructure",
    "commit": "<git-sha>",
    "path": "kits/login",
    "sha256": "<sha256>"
  },
  "distribution": {
    "package": "@powerfarm/login-kit",
    "tarball": "<release-url>",
    "sha256": "<sha256>"
  },
  "preview": {
    "url": "https://ui.powerfarm.app/artifacts/pf.ui.auth.login/0.1.0/",
    "deploymentUrl": "<immutable-vercel-deployment-url>",
    "mode": "interactive"
  }
}
```

## 6. UI viva no Vercel

### 6.1 Topologia escolhida

Serão mantidos dois deployments com criticidade diferente:

1. `registry.powerfarm.app`: Identity, login operacional, consentimento, account, admin e Store;
2. `ui.powerfarm.app`: galeria e previews construídos a partir da Superstructure.

Não haverá um projeto Vercel por kit nesta fase.

### 6.2 Endereços canônicos

Cada versão renderizável recebe uma rota permanente:

```text
https://ui.powerfarm.app/artifacts/<artifact-id>/<version>/
```

Essa rota nunca muda de conteúdo depois da admissão. Uma versão nova cria outra rota. O manifesto também registra a deployment URL imutável do Vercel como recibo.

### 6.3 Modos de renderização

- SVG, imagem, fonte e tokens: renderização direta, download e metadados.
- Brand Kit: paleta, tipografia, logos, regras e arquivos associados.
- Componentes e kits: iframe sandboxed apontando para o preview vivo.
- Schemas: visualização estruturada e source.
- Prompts e policies: conteúdo legível, versão e relações.
- Artefato sem build válido: aparece como candidato administrativo, não como item público da Store.

## 7. Login Kit canônico

### 7.1 Separação UI/adapters

O kit atual da Superstructure fornece estados e gramática visual, mas seu comportamento demonstrativo não é autenticação real. Ele será dividido conceitualmente em:

- `LoginView`: estados, validação visual e acessibilidade;
- `LoginController`: navegação entre estados;
- `AuthAdapter`: operações externas;
- `PreviewAuthAdapter`: comportamento demonstrativo da galeria;
- `SupabaseAuthAdapter`: implementação operacional pertencente ao Registry.

O kit não conhece URL, cookies, Supabase, callback ou client secret.

### 7.2 Fluxo operacional único

```text
App
  │ redirect com client_id, callback, state e PKCE
  ▼
Supabase /oauth/authorize
  │ valida pedido
  ▼
Registry /oauth/consent?authorization_id=...
  │ sem sessão
  ▼
Registry /login?redirect=...
  │ autentica pela UI canônica
  ▼
Registry /oauth/consent
  │ aprova ou nega
  ▼
callback do App
  │ troca code por tokens
  ▼
sessão interna do App
```

O app pode consumir um botão/launcher canônico pequeno, mas nunca incorpora o formulário completo nem recebe credenciais Supabase do Registry.

## 8. Onboarding OAuth de aplicações

### 8.1 Acesso

O onboarding vive em `/admin/apps/new` e exige:

- sessão Supabase válida;
- identidade Powerfarm vinculada;
- grant `registry.admin` ou `oauth.clients.manage` válido;
- verificação novamente dentro da API server-side.

Esconder o link no frontend não é autorização.

### 8.2 Dados solicitados

- nome da aplicação;
- homepage canônica;
- logo ou artifact ID do logo;
- ambiente;
- tipo `public` ou `confidential`;
- redirect URIs exatos;
- proprietário Powerfarm;
- scopes inicialmente permitidos.

### 8.3 Transação lógica

1. validar o administrador e a entrada;
2. criar ou selecionar `identities(kind = 'app')`;
3. chamar a OAuth Admin API do Supabase no servidor;
4. receber `client_id` e, quando aplicável, `client_secret`;
5. registrar a relação entre app, cliente, ambiente e criador;
6. mostrar o secret uma única vez;
7. oferecer configuração de integração e teste do callback;
8. marcar onboarding como ativo somente após callback verificado.

Se o registro local falhar depois de o Supabase criar o cliente, a operação deve ser reconciliável: o cliente fica visível como `unlinked` para um admin associar ou revogar. Não se cria outro cliente silenciosamente.

### 8.4 Persistência mínima

Reutilizar:

- `identities` para a entidade app;
- `grants` para administração;
- `auth.oauth_clients` como verdade do cliente OAuth;
- `artifacts` para logos admitidos, quando aplicável.

Adicionar somente `public.app_oauth_clients`, a relação `app identity ↔ provider OAuth client`. Seu contrato mínimo é:

- `id uuid` como chave primária;
- `app_identity_id uuid` referenciando `identities(kind = 'app')`;
- `oauth_client_id uuid` único, devolvido pelo Supabase OAuth Admin;
- `environment text` e `status text`;
- `created_by uuid`, `created_at`, `verified_at` e `revoked_at`.

A tabela não guarda secret nem replica os campos de `auth.oauth_clients`. Como o schema `auth` é administrado pelo Supabase, a existência do cliente é verificada pela OAuth Admin API e reconciliada pelo `oauth_client_id`, sem criar foreign key para uma tabela interna do provedor.

## 9. Área autenticada e administrativa

### 9.1 `/account`

Disponível a qualquer pessoa autenticada:

- identidade vinculada;
- cargos/ocupações;
- aplicações relacionadas;
- consentimentos OAuth ativos e possibilidade de revogação;
- chaves da própria identidade, quando aplicável.

### 9.2 `/admin`

Disponível apenas por grant:

- aplicações e clientes OAuth;
- callbacks, tipo e estado dos clientes;
- criação, revogação e rotação de secret;
- identidades, vínculos e grants;
- candidatos e admissões da Store;
- diagnóstico de source/build/preview.

Grants administrativos iniciais são concedidos à identidade `danvoulez` por migration forward-only. Policies atuais baseadas apenas em `eh_membro()` devem ser restringidas antes de expor a área a outros utilizadores.

## 10. Store

### 10.1 Fonte e projeção

A Superstructure produz candidatos. O Registry admite versões. A Store mostra somente versões admitidas.

```text
Superstructure release
        │ manifest + hashes + live URLs
        ▼
Registry admin — candidato
        │ admitir
        ▼
artifact + artifact_version
        │
        ▼
Store autenticada na primeira entrega
```

A admissão nunca é automática só porque uma release foi publicada.

### 10.2 Prateleiras

- Marca: símbolo, wordmark, cores, fontes e Brand Kit.
- UI: primitivas e componentes.
- Kits: Login, Onboarding, Install, Uninstall, Alerts, Notifications e CI/CD.
- Agents, policies, prompts e schemas quando existirem como artefatos admitidos.

As prateleiras vazias permanecem visíveis e honestas.

A primeira entrega mantém a Store atrás da sessão Powerfarm já exigida pelo Registry. Tornar o catálogo público é uma mudança posterior de produto e não altera o contrato de admissão, source ou preview.

### 10.3 Card e detalhe

Um card apresenta:

- preview real;
- nome e artifact ID;
- versão e status;
- origem Superstructure;
- disponibilidade de package/download.

O detalhe apresenta:

- preview vivo;
- GitHub source fixado ao commit;
- SHA-256;
- package/tarball;
- dependências e relações;
- histórico de versões;
- recibo de build e deployment.

## 11. Reconciliação de migrations

### 11.1 Estado encontrado

O banco vivo contém:

- `0001 identity`;
- `0002 manifest`;
- `0003 autoridade`;
- `0004 adk_runtime`;
- `0005 adk_runtime_advisors`;
- `20260820192536 gadget_lineage`.

Os sources dessas migrations foram encontrados localmente e na branch `codex/powerfarm-v0.1`.

### 11.2 Regra de reparação

1. publicar no branch canônico exatamente os arquivos já aplicados;
2. verificar conteúdo e ordem contra `supabase_migrations.schema_migrations`;
3. preservar `0004_adk_runtime` como migration aplicada;
4. renumerar a migration ainda não aplicada `0004_admit_brand_v03.sql` para uma nova versão posterior a `20260820192536`;
5. nunca resetar o projeto Supabase nem editar o histórico remoto;
6. adicionar um check que falha quando uma migration remota não possui source correspondente no Git.

### 11.3 Acoplamentos adiados

Cloudflare OS e ADK não possuem tabelas duplicadas com os mesmos nomes, mas estão acoplados ao núcleo por foreign keys e por `runs` compartilhado.

Nesta entrega:

- nenhuma dessas tabelas é apagada;
- nenhum dado é movido;
- nenhuma feature nova do Registry depende delas;
- sua propriedade é documentada como externa ao Registry.

A extração futura terá projeto próprio e plano de migração independente.

## 12. Segurança

- Secret key Supabase existe somente no backend do Registry.
- Client secret aparece uma vez e nunca entra em logs, analytics ou tabelas públicas.
- Redirect URIs usam correspondência exata e HTTPS em produção.
- Todos os clientes usam Authorization Code com PKCE.
- `state` é obrigatório e validado no callback.
- O Registry verifica admin antes de cada chamada OAuth Admin.
- Policies do banco repetem o gate; não confiam somente no servidor Next.js.
- Rotação e revogação de clientes exigem grant e confirmação explícita.
- Previews interativos rodam em iframe sandboxed, sem cookies ou credenciais do Registry.
- O token identifica o utilizador; cada app decide suas permissões internas.

## 13. Falhas e reconciliação

- **Cliente criado e vínculo local falhou:** mostrar como `unlinked`; permitir associar ou revogar.
- **Secret perdido:** nunca recuperá-lo; regenerar explicitamente.
- **Callback inválido:** onboarding permanece `pending_verification`.
- **Build sem preview:** candidato não pode ser admitido como UI viva.
- **Source hash divergente:** bloquear admissão e deployment.
- **Preview indisponível:** manter source/proveniência e marcar apresentação degradada.
- **Release parcial:** não atualizar aliases de versão aprovada.
- **Login Kit novo incompatível:** Registry continua na versão anterior fixada no lockfile.

## 14. Sequência de entrega

### Fase A — custódia

1. registrar backup e inventário do Supabase vivo;
2. consolidar migrations no Git;
3. resolver o conflito de numeração forward-only;
4. congelar novas migrations até o check de paridade existir.

### Fase B — cânone

1. publicar a Superstructure;
2. alinhar catálogo, delivery e scripts reais;
3. classificar Login como obrigatório e os demais kits como opcionais;
4. gerar a primeira release executável.

### Fase C — UI viva

1. publicar `ui.powerfarm.app`;
2. hospedar rotas versionadas dos artefatos;
3. separar PreviewAuthAdapter do SupabaseAuthAdapter;
4. fazer o Registry consumir o Login Kit versionado.

### Fase D — Registry

1. restringir grants e RLS administrativos;
2. construir `/account` e `/admin`;
3. implementar onboarding OAuth;
4. testar cliente público e confidencial;
5. migrar o login central sem mudar o endpoint público.

### Fase E — Store

1. ingerir manifestos como candidatos;
2. admitir a primeira release da Superstructure;
3. renderizar Brand Kit, assets e previews vivos;
4. publicar source, hash e deployment receipts.

Cloudflare OS, ADK e processos não fazem parte dessas fases de implementação.

## 15. Verificação

### 15.1 Supabase e Registry

- paridade completa entre migrations remotas e Git;
- RLS impede utilizador comum de listar/criar/rotacionar clientes;
- admin autorizado consegue completar onboarding;
- cliente público não recebe secret;
- cliente confidencial recebe secret uma vez;
- callback exato é aceito e callback divergente é rejeitado;
- `authorization_id` sobrevive ao login;
- consentimento aprovado retorna código ao app;
- token validado identifica a mesma Powerfarm identity registrada.

### 15.2 Superstructure

- catalog validation e Brand Guard passam;
- packages são reproduzíveis;
- hashes do manifesto correspondem aos bytes publicados;
- Login Kit funciona com PreviewAuthAdapter e SupabaseAuthAdapter;
- kits opcionais não são necessários para construir ou operar login.

### 15.3 Store

- toda UI publicada tem source URL e live URL;
- live URL versionada não muda após admissão;
- iframe não recebe cookies do Registry;
- source, commit, path e SHA são exibidos;
- artefato sem preview válido não aparece como UI viva.

## 16. Critérios de aceitação

O trabalho estará concluído quando:

1. a Superstructure estiver pública no GitHub como fonte canônica;
2. existir uma release reproduzível com manifesto, packages e previews;
3. `ui.powerfarm.app` apresentar as peças renderizáveis;
4. `registry.powerfarm.app/login` usar o Login Kit da Superstructure;
5. uma única Powerfarm Identity atender todos os apps onboarded;
6. um admin conseguir registrar um app, callback e cliente OAuth pelo Registry;
7. o app receber client ID e, quando confidencial, secret uma única vez;
8. o Registry registrar a entidade app e sua relação com o cliente OAuth;
9. utilizadores não administrativos não acessarem operações OAuth Admin;
10. a Store mostrar artefatos vivos apontando para source canônico fixado;
11. Git e Supabase terem história de migrations reconciliada;
12. Cloudflare OS, ADK e processos permanecerem fora do escopo da mudança.

## 17. Fora de escopo

- extrair agora as tabelas Cloudflare OS;
- mover agora o runtime ADK;
- mover processos do Neon;
- criar um projeto Vercel por kit;
- habilitar registro OAuth dinâmico para qualquer cliente;
- fazer a Powerfarm administrar permissões internas dos apps;
- admitir automaticamente toda release;
- redesenhar a identidade visual existente.
