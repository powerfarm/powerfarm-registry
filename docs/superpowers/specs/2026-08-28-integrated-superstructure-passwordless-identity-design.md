# Superstructure integrada e Powerfarm Identity passwordless

**Status:** desenho aprovado; aguardando revisão da spec antes do plano de implementação

**Data:** 2026-08-28

**Substitui:** `2026-08-28-superstructure-registry-identity-design.md`

**Escopo:** integrar Registry, marca, UI e Identity em um monorepo canônico;
publicar a Powerfarm Identity em `id.powerfarm.app`; e oferecer login humano
somente por magic link e passkey, sem duplicar a marca nos consumidores.

## 1. Decisão

O repositório atual do Registry será promovido à Superstructure executável da
Powerfarm. Ele preservará o histórico, as migrations e o vínculo Vercel do
Registry, e receberá a fonte canônica da marca e os packages compartilhados.

O monorepo produzirá dois hosts operacionais:

1. `id.powerfarm.app`, a origem única do login e consentimento Powerfarm;
2. `registry.powerfarm.app`, o Registry de entidades, clientes, grants,
   admissões e Store.

Os hosts terão projetos Vercel separados, mas serão construídos do mesmo
commit e consumirão os mesmos packages. Registry e futuros apps iniciarão OAuth
e redirecionarão a pessoa para a Identity. Eles não copiarão, incorporarão em
iframe nem baixarão o formulário de login em runtime.

Não haverá senha para identidades humanas. Magic link será acesso inicial,
fallback e recuperação. Passkey será o acesso rápido depois que a posse do
email tiver sido confirmada.

## 2. Estado atual verificado

- `registry.powerfarm.app` serve o projeto Vercel `powerfarm-registry`.
- `/login` importa `ui/auth/PowerFarmLogin.tsx` do próprio Registry; não existe
  consumo de UI externa.
- `id.powerfarm.app` ainda não está associado a um deployment operacional.
- a pasta local `POWERFARM-Superstructure-v0.1.0` não é um repositório GitHub.
- o Login Kit local é uma demonstração: contém credenciais, códigos e
  transições simuladas e não será importado como implementação.
- a marca v0.5.1 possui fontes identificadas, generators, ativos, licenças e um
  `brand-lock.json`, mas o `ui-core` local também contém cópias desses arquivos.
  Essa duplicação não será admitida no monorepo.
- o suporte de passkey do Supabase existe, requer `supabase-js` 2.105.0 ou
  posterior e permanece experimental em 2026-08-28.

## 3. Invariantes

1. Cada valor ou ativo visual Powerfarm possui exatamente uma fonte canônica.
2. Apps e componentes importam a marca; nunca repetem seus valores.
3. Um arquivo gerado não se torna uma segunda autoridade.
4. Nenhum CSS fora do package de marca contém cores, famílias tipográficas ou
   ativos copiados da marca.
5. `ui-core` define papéis semânticos exclusivamente por referência a tokens
   da marca, por exemplo `--pf-text-primary: var(--pf-powerfarm-cream)`.
6. `identity-ui` usa somente tokens semânticos de `ui-core` e tokens próprios
   do componente declarados uma vez no próprio package.
7. O host fornece comportamento por adapter; `identity-ui` não importa
   Supabase, Vercel, Registry nem URLs de produção.
8. A página pública única de entrada humana é
   `https://id.powerfarm.app/login`.
9. Registro de passkey exige usuário existente, email confirmado e sessão
   autenticada.
10. Magic link permanece disponível quando WebAuthn não existe, não encontra
    credencial, é cancelado ou falha.
11. O identificador digitado nunca revela se existe conta ou passkey.
12. O pedido OAuth sobrevive ao magic link e à criação de passkey sem aceitar
    um redirect arbitrário vindo do navegador.
13. O Registry recebe sua própria sessão por Authorization Code com PKCE; ele
    não compartilha cookies de sessão com `id.powerfarm.app`.
14. A primeira entrega tem uma única direção visual, derivada da marca
    canônica. Não haverá temas ou variantes experimentais.
15. Engine, Workers, workflows e kits operacionais simulados permanecem fora
    deste escopo.

## 4. Uma marca, três camadas de referência

### 4.1 Fonte da marca

`brand/` será admitido como package `@powerfarm/brand`. As autoridades de
autoria são:

- tokens: os arquivos `*-tokens.json` de `color`, `typography`, `layout`,
  `iconography`, `graphic-elements`, `patterns`, `imagery` e `applications`;
- símbolo: `brand/logo/geometria.py`;
- wordmark: o master vetorial documentado em `brand/logo/SOURCE-STATUS.md`;
- fontes: WOFF2 e licenças em `brand/typography`;
- regras: `POWERFARM-Brand-Manual-v0.5.1.md` e READMEs específicos.

CSS, variantes de logo, boards, aplicações e PDF são derivados. Quando
necessários no build, são produzidos por generators determinísticos para um
diretório ignorado pelo Git. Não serão copiados para `public/`, `ui-core` ou
cada app.

O package exportará endereços estáveis, por exemplo:

```text
@powerfarm/brand/css
@powerfarm/brand/logo/horizontal-cream
@powerfarm/brand/logo/symbol-cream
@powerfarm/brand/fonts/inter-regular
@powerfarm/brand/tokens/color
```

Os exports resolvem para outputs derivados do mesmo source durante o build.

### 4.2 Semântica de interface

`@powerfarm/ui-core` não possuirá `brand-source/`, cópias de fontes, cópias de
logos nem uma tabela independente de valores. Ele dependerá de
`@powerfarm/brand` e definirá apenas papéis de interface:

```css
--pf-surface-canvas: var(--pf-powerfarm-black);
--pf-text-primary: var(--pf-powerfarm-cream);
--pf-action-primary-bg: var(--pf-energy-amber);
```

Controles e motion que não fazem parte da marca terão uma única definição em
`ui-core`. Nenhum consumidor repetirá esses valores.

### 4.3 Componente Identity

`@powerfarm/identity-ui` conterá o componente React, sua máquina de estados e
seus tokens de composição. Ele consumirá `ui-core`; não redefinirá cores,
tipografia, logos ou espaçamentos globais.

Qualquer medida específica da superfície de login — por exemplo largura máxima
do painel — recebe um token `--pf-identity-*` definido uma vez no package. Os
hosts apenas importam o stylesheet do package.

### 4.4 Guard e proveniência

O build produzirá um lock com hashes SHA-256 das fontes canônicas e das saídas
derivadas. CI falhará quando:

- uma fonte canônica mudar sem atualização explícita do lock;
- um output gerado divergir do generator;
- um arquivo fora de `brand/` repetir um literal de cor ou família da marca;
- fontes, logos ou ícones da marca aparecerem copiados em outro package;
- um app usar um caminho relativo para alcançar internals da marca em vez de
  um export público.

O guard aceitará `var(...)`, tokens locais documentados e valores funcionais
sem equivalência de marca. Ele não substituirá lint de acessibilidade.

## 5. Topologia do monorepo

O destino canônico dentro do repositório atual é:

```text
<repository-root>/
├── apps/
│   ├── identity/          Next.js → id.powerfarm.app
│   └── registry/          Next.js → registry.powerfarm.app
├── brand/                 @powerfarm/brand, única fonte visual
├── packages/
│   ├── ui-core/           aliases e contratos semânticos
│   ├── ui/                primitivas React
│   ├── patterns/          composições sem comportamento fictício
│   └── identity-ui/       superfície passwordless
├── supabase/              migrations e testes existentes
├── scripts/               generators, lock e guards
└── docs/
```

A migração não começa movendo o Registry. Primeiro o workspace, a marca e a
Identity são construídos ao lado da aplicação raiz existente. O Root Directory
do projeto Vercel `powerfarm-registry` só muda para `apps/registry` depois que
um preview desse caminho reproduzir o comportamento atual. Isso separa a
reorganização do corte OAuth.

## 6. Superfície visual da Identity

A primeira tela usa a composição escura da Powerfarm, wordmark canônico,
tipografia Anton apenas no display e Inter em controles e texto. O amber é
restrito à ação e ao foco; tints estruturam painel, campo e divisores. Não há
ilustração inventada nem nova linguagem de marca.

Conteúdo inicial:

```text
POWERFARM

Entre na Powerfarm

[ nome@empresa.com              ]
[ Enviar magic link             ]
[ Entrar com passkey            ]

Novo por aqui? Criar conta

<app solicitante> está solicitando acesso
```

O campo de email é o único campo de texto. Ele permanece visível e preserva o
valor durante a troca entre entrada e cadastro. Magic link e cadastro exigem
email válido. Passkey discoverable pode ser selecionada pelo botão ou pelo
autofill WebAuthn sem redigitar o email. Se a passkey não estiver disponível,
o email já presente alimenta o fallback por magic link.

O campo usa os hints de autofill de email/username e WebAuthn permitidos pelo
navegador. A identidade devolvida pela passkey é a autoridade; o texto no
campo nunca seleciona nem restringe uma credential WebAuthn.

## 7. Máquina de estados

`identity-ui` expõe estados, eventos e callbacks tipados:

```text
idle
├── request-magic-link → sending-link → link-sent
├── choose-sign-up     → sign-up
└── choose-passkey     → passkey-prompt

sign-up
└── confirm-email      → sending-confirmation → confirmation-sent

magic callback / confirmation callback
└── authenticated
    ├── no passkey → offer-passkey → registering-passkey
    └── passkey exists or skip → resume-authorization

passkey-prompt
├── success             → authenticated → resume-authorization
├── unavailable/cancel  → recover-with-email
└── failure             → recover-with-email
```

Estados de erro ficam no mesmo painel e preservam email e transação. A UI
distingue cancelamento, indisponibilidade e erro técnico, mas nunca informa se
o email está registrado.

## 8. Contrato do adapter

`identity-ui` recebe capacidades, não um cliente Supabase:

```text
requestMagicLink(email, transaction)
requestSignUp(email, transaction)
signInWithPasskey(transaction)
registerPasskey(session)
resumeAuthorization(transaction)
```

`apps/identity` implementa essas capacidades com Supabase. O contrato permite
substituir a API experimental de passkey sem alterar componente ou fluxo.

Magic link de entrada usa criação desabilitada. Sign-up usa criação habilitada
e confirmação de email. O callback verifica o token, cria a sessão no host
Identity, recupera a transação e oferece a primeira passkey antes de retomar o
consentimento.

## 9. OAuth e transações

O fluxo operacional é:

```text
Registry ou app
  → Supabase /oauth/authorize com PKCE
  → id.powerfarm.app/oauth/consent?authorization_id=...
  → id.powerfarm.app/login quando não há sessão
  → magic link ou passkey
  → consentimento preservado
  → approveAuthorization / denyAuthorization
  → callback exato do cliente
  → troca do code e sessão própria do cliente
```

O `Site URL` do projeto Supabase será `https://id.powerfarm.app` e o
Authorization Path será `/oauth/consent`. Redirect URIs dos clientes permanecem
separados e exatos.

O navegador carrega somente um identificador opaco da transação. No servidor,
ela relaciona `authorization_id`, intenção, timestamps e continuação permitida.
Expira rapidamente, é de uso único e não aceita URL arbitrária. O callback por
email pode recuperar a transação sem depender exclusivamente de um cookie do
navegador que iniciou o fluxo.

## 10. Passkey e domínio

O RP ID inicial será `id.powerfarm.app` e a origem permitida será
`https://id.powerfarm.app`. A escolha é deliberadamente estreita porque toda
cerimônia WebAuthn ocorre na Identity central. Registry e outros apps não
registram passkeys localmente.

Mudar o RP ID invalida passkeys existentes; portanto ele será configurado antes
do primeiro cadastro real e coberto por um teste de configuração. Localhost usa
configuração de desenvolvimento separada e nunca compartilha credentials com
produção.

Magic link é recuperação obrigatória. A área de conta permitirá listar,
renomear e apagar passkeys, mostrando sua proveniência quando o Supabase a
fornecer.

## 11. Migração e publicação

1. preservar e verificar a pasta-fonte local da Superstructure;
2. admitir `brand/` no repositório atual, excluindo caches e outputs de release;
3. criar o workspace e `@powerfarm/brand` sem alterar rotas do Registry;
4. criar generator, lock e guard de não duplicação;
5. reconstruir `ui-core` sobre imports da marca;
6. implementar e testar `identity-ui` sobre `ui-core`;
7. criar `apps/identity` com adapter Supabase e preview Vercel;
8. validar visual, magic link, callback, passkey e retomada OAuth em preview;
9. associar `id.powerfarm.app` ao projeto Identity e configurar DNS/TLS;
10. atualizar Site URL, Authorization Path, redirect allowlist e RP ID no
    Supabase como uma mudança coordenada;
11. registrar o Registry como cliente OAuth e cortar seu login local;
12. mover o Registry para `apps/registry` somente depois da paridade em preview;
13. remover o componente e CSS antigos apenas quando nenhuma importação restar.

Cada corte possui rollback para o deployment anterior. `registry.powerfarm.app`
continua operacional até o host Identity e seu OAuth passarem pelo smoke test.

## 12. Erros e recuperação

- email inválido: validação local sem chamada externa;
- link solicitado: mensagem neutra para conta existente ou inexistente;
- rate limit: informa quando tentar novamente sem revelar cadastro;
- link expirado: volta ao mesmo email e permite novo envio;
- passkey cancelada: retorna à tela com magic link disponível;
- WebAuthn indisponível: oculta promessa de passkey e preserva email;
- passkey experimental incompatível: adapter cai para magic link e registra
  telemetria sem credential material;
- transação OAuth expirada: explica a expiração e volta ao app por endereço
  cadastrado, não por parâmetro livre;
- callback inválido: encerra a tentativa sem criar sessão;
- falha de geração da marca: bloqueia o build, em vez de usar cópia stale.

## 13. Verificação

### Marca

- hashes das fontes e outputs;
- geração reproduzível em checkout limpo;
- busca por duplicação de cores, famílias, logos, ícones e fontes;
- imports públicos obrigatórios;
- contraste segundo as regras v0.5.1.

### UI

- máquina de estados e callbacks;
- teclado, foco visível, leitor de tela e redução de movimento;
- viewport mobile e desktop;
- estados idle, sending, success, expired, canceled e failure;
- comparação visual contra os boards e regras canônicas da marca.

### Auth

- magic link de usuário existente não cria conta;
- sign-up confirma email e cria sessão;
- primeira passkey só registra depois de sessão confirmada;
- passkey existente cria sessão sem senha;
- cancelamento e indisponibilidade caem para magic link;
- nenhum caminho aceita password;
- respostas não permitem enumeração de email.

### OAuth e deploy

- `authorization_id` sobrevive a login, email e passkey;
- PKCE, callback exato e troca de code;
- cookies separados entre Identity e Registry;
- `id.powerfarm.app` resolve, possui TLS e serve o deployment Identity;
- `registry.powerfarm.app` inicia OAuth e recebe uma sessão própria;
- rollback dos dois projetos;
- nenhuma mutação do Supabase ocorre antes do preview validado.

## 14. Critérios de aceitação

O desenho estará implementado quando:

1. a marca existir uma única vez em `brand/` e os consumidores usarem exports;
2. o guard reprovar uma cópia proposital de token ou ativo;
3. `id.powerfarm.app` servir a única UI operacional de login;
4. a tela possuir um campo de email, magic link, passkey e sign-up, sem senha;
5. cadastro confirmar email, criar sessão e oferecer a primeira passkey;
6. passkey existente autenticar e magic link recuperar qualquer pessoa;
7. o pedido OAuth retomar o app correto sem open redirect;
8. Registry não contiver implementação própria do formulário de login;
9. os dois deployments forem reproduzíveis a partir do mesmo commit canônico;
10. código, docs, Store e manifesto apontarem para os paths e hashes reais.

## 15. Fora do escopo

- password, reset de password ou migração automática de passwords antigas;
- login social ou enterprise SSO;
- passkeys executadas diretamente dentro de apps consumidores;
- engine, runtime, Cloudflare Workers ou ADK;
- kits de install, uninstall, CI/CD, alertas, notificações e onboarding;
- publicação de código simulado como package operacional;
- múltiplas direções visuais ou temas da Identity inicial.
- renome do repositório durante esta implementação.

## 16. Referências normativas

- [Supabase: Passkey authentication](https://supabase.com/docs/guides/auth/passkeys)
- [Supabase: Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase: OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
- [W3C: Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [Google: Passkeys user journeys](https://developers.google.com/identity/passkeys/ux/user-journeys)
- [FIDO Alliance: UX Guidelines for Passkey Creation and Sign-ins](https://fidoalliance.org/wp-content/uploads/2023/05/FIDO-Alliance-UX-Guidelines-for-Passkey-Creation-and-Sign-ins.pdf)
