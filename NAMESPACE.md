# PowerFarm — nomes de rede

Domínio raiz: **`powerfarm.app`**, zona na Cloudflare.
Os nameservers ficam na Cloudflare. Nada muda isso: a zona tem MX, DKIM e
Workers a depender dela.

## Subdomínio ou path

Subdomínio quando há **fronteira operacional real**: origem HTTP própria,
deploy independente, sessão e cookies próprios, callback de OAuth próprio, ou
capacidade de continuar de pé quando outra aplicação cai.

Path quando é a **mesma aplicação, mesma origem, mesmo ciclo de deploy**.

A pergunta que decide: separar isto exigiria uma razão operacional concreta?
Se sim, subdomínio. Se é só arrumação visual, path.

## Reservados

| Nome | O que é | Onde vive | Dono |
| --- | --- | --- | --- |
| `powerfarm.app` | **apex — deve deixar de ser a plataforma** | hoje: Worker `powerfarm` | — |
| `platform.powerfarm.app` | Cloudflare OS, a plataforma | Worker `powerfarm` | plataforma |
| `registry.powerfarm.app` | Identity: identidades, chaves, Store | Vercel `powerfarm-registry` | Identity |
| `ui.powerfarm.app` | origem canónica dos blocos de UI | por decidir | Identity |
| `docs.powerfarm.app` | documentação | por criar | — |
| `status.powerfarm.app` | estado dos serviços | por criar | — |

Paths do Identity, porque partilham origem, sessão e deploy:

    registry.powerfarm.app/            identidades
    registry.powerfarm.app/chaves
    registry.powerfarm.app/store
    registry.powerfarm.app/clientes
    registry.powerfarm.app/auth/callback
    registry.powerfarm.app/api/manifest

## Nomes

Curtos, minúsculos, legíveis. Sem ambiente no nome de produção, sem números,
sem abreviação obscura, sem piada interna.

O nome público diz **o que o serviço é**, não como está implementado.

Não: `pf-reg-v2`, `identity-prod-new`, `svc-auth-01`, `registry-v3.vercel.app`.

## Ambientes

Produção não leva sufixo. Não-produção leva o ambiente como rótulo próprio,
entre o serviço e o domínio:

    registry.powerfarm.app            produção
    registry.staging.powerfarm.app    staging

Uma convenção só. Não se cria uma segunda.

## Cloudflare Tunnel

O túnel é implementação; o serviço é identidade. O nome do túnel refere o
serviço real, não a máquina nem a história:

    powerfarm-registry
    powerfarm-ui

Com ambientes, sufixo explícito: `powerfarm-registry-prod`.

## A plataforma tem de sair do apex

Hoje `powerfarm.app` é a plataforma. Está errado: o apex é o nome da empresa,
não de um dos seus serviços. A plataforma passa a `platform.powerfarm.app`, e o
apex fica livre para redirigir ou, mais tarde, servir uma landing.

Isto não se move sozinho. Estas coisas movem-se **juntas ou nenhuma**:

1. `deployment.jsonc` → `route.customDomain: "platform.powerfarm.app"`
2. redeploy da plataforma — regenera o `BASE_URL` dos 17 gatekeepers e o
   `PUBLIC_BASE_URL` do backend, todos hoje com `https://powerfarm.app/...`
3. o cliente OAuth `PowerFarm Identity Gatekeeper` tem redirect URI registado em
   `https://powerfarm.app/gatekeeper/identity/oauth`. É comparado por
   correspondência exacta: se a plataforma muda e o URI não, o login parte.
4. o apex passa a redirigir 301 para `platform.powerfarm.app`, para os links
   antigos continuarem a chegar

Ordem sem janela de queda: adicionar o domínio novo ao router **antes** de tirar
o apex, verificar, e só depois trocar o apex por regra de redirecionamento.

**Dívida conhecida, por decidir:** `api.powerfarm.app` e `app.powerfarm.app`
apontam hoje para o túnel `powerfarm-lab`, que não tem conexão activa. São
nomes mortos e ocupam dois lugares bons do namespace. Ou passam a apontar para
algo real, ou saem.

## Toda URL emitida para fora tem dono

Um serviço que gera URLs que vão ser guardadas, enviadas por email, usadas em
OAuth, em webhooks, em manifestos ou consumidas por agentes **declara a sua base
canónica** numa variável explícita:

    PUBLIC_BASE_URL=https://registry.powerfarm.app

Nunca derivada do host do pedido, do deploy de preview, nem do ambiente local.
Um URL de preview do Vercel muda a cada push; o que fica guardado não pode
depender disso.

## UI canónica não é callback

São responsabilidades diferentes e não se juntam:

**Origem do componente** responde "de onde vem esta peça".
**Redirect URI** responde "para onde o authorization server devolve o utilizador".

O bloco de login é partilhado. A volta, não: cada cliente OAuth regista os seus
redirect URIs e o servidor compara por correspondência exacta. Um callback
universal que aceitasse um destino por parâmetro seria um open redirect e uma
forma de vazar authorization codes.

    Identity     usa ui.powerfarm.app/login   volta a registry.powerfarm.app/auth/callback
    Plataforma   usa ui.powerfarm.app/login   volta a powerfarm.app/auth/callback
    Parceiro     usa ui.powerfarm.app/login   volta a parceiro.exemplo.com/oauth/powerfarm/callback

Mesma porta de entrada. Destinos diferentes, cada um registado no seu cliente.

E há dois conjuntos de redirect URLs no Supabase que não se devem confundir: os
que valem quando alguém entra **na nossa app** por Google ou GitHub, e os dos
clientes que usam a PowerFarm **como provedor**. São configurações separadas.
