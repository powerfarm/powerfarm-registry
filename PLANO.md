# PowerFarm — plano do banco

Uma base. Um projeto Supabase: `wmsrqefgdgcijupeogfa`.
Migrations só para a frente. Depois da primeira linha real, nunca mais reset.

## Invariantes

Valem para todas as migrations. Se uma delas quebrar isto, está errada.

1. **Nada escreve com a service key em runtime.** Só migrations. Toda escrita de
   aplicação carrega um utilizador, e a RLS decide.
2. **Ocupante e cargo são coisas diferentes.** O modelo é efémero; o cargo que
   ele ocupa é durável, e é o cargo que assina. São identidades, com id estável
   e chave: `person`, `office`, `app`. Não são identidades, e sim definições com
   hash: versão de modelo, engine, prompt, spec de ferramenta, grafo.
2b. **Atribuição é obrigatória.** Toda tabela tem `created_by` (identity) e, onde
   fizer sentido, `run_id`. Acrescentar agora custa uma coluna; depois significa
   que tudo o que já lá está não tem proveniência.
3. **Validade é timestamp, nunca referência a ledger.** `valid_from`,
   `valid_until`, `revoked_at`. "Isto vale agora?" responde-se com um SELECT.
4. **Estado mutável numa linha, log append-only ao lado.** É o que o ADK já faz
   entre `state` e `events`. Não há fold para reconstruir nada.
5. **Canonicalização e hash acontecem na app que escreve**, nunca numa edge
   function. O banco confere com CHECK. Assim ninguém precisa de um serviço vivo
   para escrever.
6. **RLS ligada em toda a tabela.** Leitura para autenticado. Escrita por grant.
7. **Sem trigger com regra de negócio.** Trigger só para `updated_at`.

## As migrations

### 01 — identidade
`identities`, `identity_keys`, `identity_links`, `occupancies`

`occupancies` guarda quem estava na cadeira: `identity_id`, `definition_hash`,
`valid_from`, `valid_until`. Um run grava as duas coisas — quem assinou (o cargo,
durável) e quem executou (a versão do modelo, efémera).

Quem existe, que chave é de quem, e quem é quem no Supabase Auth.
É a cola: o `user_id` do ADK, o sign-in do Cloudflare OS e o bearer dos LABs
passam todos a apontar para o mesmo id.

### 02 — CAS
`blobs (hash pk, bytes, media_type, created_at)`

Só INSERT, nunca UPDATE nem DELETE.
`check (hash = encode(sha256(bytes),'hex'))` — integridade sem serviço nenhum.
Opcional: nada nas migrations seguintes obriga a usar.

### 03 — registry
`definitions`

O primeiro livro: o que existe como conceito. Não são actores — esses estão em
`identities`. São **definições imutáveis e versionadas**: spec de ferramenta,
versão de modelo, definição de grafo, blueprint.
Chave é o hash. Aponta para `blobs`. Tem dono: uma identity.

**Nasce com nome estável E versão com hash.** A loja interna precisa de "a versão
mais recente do kit de login" — isso é um nome que aponta para um hash. Se a
tabela só tiver hash, cada versão é um objecto solto e ninguém sabe qual é a boa.
É a mesma regra do cargo e do ocupante, aplicada outra vez: ponteiro mutável para
conteúdo imutável.

Peça que vive em git não precisa de `blobs`: o commit sha já é o endereço de
conteúdo. Guarda-se origem e ref. O `blobs` fica para o que não está em git —
assets de marca, logo, design — e esses vão para o R2 por hash.

### 04 — rules
`grants`

O segundo livro: **o mandato do cargo**. Quem pode o quê, em que versão.
Um cargo sem mandato escrito é só um nome, e a assinatura dele não atesta nada.
Regra vira dado — `identity_id`, `action`, `resource`, `granted_by`,
`valid_from`, `valid_until`, `revoked_at`.
As policies de RLS das outras tabelas passam a ler daqui. É por isso que esta
vem antes das que guardam factos.

### 05 — runs e approvals
`runs`, `approvals`

`runs` é a tabela fina da cadeia de custódia: aponta para a sessão do ADK e fixa
os hashes — que cargo assinou, que ocupante executou, que definições usou, que
artefactos saíram. Não duplica os eventos do motor.

`approvals` é a tua contra-assinatura: o que foi aprovado (hash), quem aprovou,
quando, assinatura. Append-only.

Disciplina: **aprovação é facto registado, não processo orquestrado.** O esperar
por ti é trabalho do ADK — ele tem `NodeStatus.WAITING`, `interrupts` e
`resume_inputs` para isso. Confundir as duas coisas foi o que gerou
`ReviewRequested` e `AuthorizationResolved` no pack antigo.

### 06 — estado
`facts`

O terceiro livro: o facto institucional. Linhas mutáveis, com UPDATE.
Entra muito pouco — o mundo de cada app fica no D1 dela. Aqui só o que o
ecossistema precisa de saber para ser ecossistema.

### 07 — observabilidade
`reports`

O quarto livro: o que as máquinas e as apps reportam. Append-only, porque isto
é log e log é a única coisa aqui que é naturalmente um log.
Referencia `identities` (quem reportou) e opcionalmente uma sessão do ADK.

### 08 — ADK
Schema `adk`, criado **pelo próprio motor**.

`sessions`, `events`, `app_states`, `user_states`. Não escrevemos estas tabelas
nem as versionamos: o `database_session_service` do ADK é SQLAlchemy e cria-as.
Só as lemos, e ligamos `sessions.user_id` a `identities.id`.
Nada de `adk_*` reimplementado à mão.

## O que NÃO entra

- `acts`, `commands`, `genesis`, `commit_gate` — o ciclo de vida já é o
  `NodeStatus` do ADK e nunca precisa de chegar ao banco.
- Projeções como fold sobre um ledger. Se uma leitura for lenta, é view
  materializada, não motor de reconstrução.
- Tabelas `adk_*` próprias.

## A app

Next.js + Supabase, na Vercel. Mais tarde abriga a **loja interna de peças**:
kits de login, install, notificação, alertas, onboarding, manual de marca, logo,
design — instaláveis por CLI com link de GitHub. Não é subsistema novo: é uma
tela sobre `definitions` e `blobs`.

Fica fora da plataforma de propósito. Ela autentica a plataforma, e uma coisa não
pode viver dentro daquilo que ela própria autentica — se a plataforma cair, ainda
tens de conseguir entrar para a levantar. A loja herda essa posição de borda pela
mesma razão: é de onde as peças saem. É a base da identidade forte da PowerFarm.

Ordem, e a razão dela: a app de identidade vem **primeiro** e por fora da
plataforma, porque o Cloudflare OS vai passar a autenticar contra ela. Ela não
pode depender daquilo que ela própria autentica.

Depois, quando existir o gatekeeper de Supabase Auth com `providesAuth: true`,
a mesma UI pode virar um Gadget dentro da plataforma. Aí é escolha, não
dependência.

Migration daqui a seis meses: o ficheiro está neste repo, e cola-se no SQL
Editor do Supabase. O CLI é opcional.

## Emissor de identidade

Supabase OAuth 2.1 Server, no projeto `wmsrqefgdgcijupeogfa`. Em beta.
Chave de assinatura já é assimétrica (ES256 P-256), que é requisito para OIDC.

    descoberta  /.well-known/oauth-authorization-server/auth/v1
    OIDC        /auth/v1/.well-known/openid-configuration
    JWKS        /auth/v1/.well-known/jwks.json

Registo dinâmico de clientes vem desligado por omissão. Clientes MCP costumam
precisar dele.

**Token não é assinatura.** O OAuth diz "este cliente pode agir por este
utilizador" — autorização. A assinatura do cargo é um acto separado, sobre
conteúdo, com a chave do cargo, guardado em `runs` e `approvals`. Se as duas se
confundirem, o produto deixa de existir.
