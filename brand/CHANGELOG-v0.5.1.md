# POWERFARM Brand System — v0.5.1

Patch release over v0.5. No visual redesign is intended here. This release closes the application-propagation defect, removes stale documentation, and aligns every active release marker with v0.5.1.

## v0.5.1 — a propagação era uma migração disfarçada

Encontrado a rever o pacote fechado, e é o defeito mais sério de toda esta
série de releases, porque atinge precisamente a coisa que a v0.5 dizia
resolver.

**O que estava errado.** `gerar.py` encontrava o símbolo dentro de cada
aplicação procurando a assinatura do path antigo, `M 184.00 36.00`. Funcionou
uma vez. Depois da troca essa assinatura deixa de existir, portanto na segunda
execução o gerador já não reconhecia nada e reportava zero aplicações.

Alterar a geometria e correr o gerador mudava os ficheiros de logo e deixava as
dez aplicações intactas. Fonte única no papel, migração one-shot na prática.

**Pior do que o bug: eu li o sintoma e chamei-lhe uma virtude.** Ao fechar os
pacotes escrevi que o gerador era "idempotente nas aplicações, porque já não
resta nenhum símbolo antigo para trocar". O comportamento observado era o do
defeito, e a explicação encaixava bem demais para ser questionada.

**O conserto.** Cada grupo passa a levar dois atributos:

```xml
<g data-pf-symbol="master" data-pf-box="cx cy largura"> … </g>
```

`data-pf-box` guarda o rectângulo óptico que o símbolo deve ocupar nas
coordenadas da própria aplicação. A geometria lá dentro passa a ser
descartável: cada execução apaga-a e volta a desenhar a partir de
`geometria.py`, calculando a transformação que preenche a caixa guardada.

Isto sobrevive a alterações da forma. Se a marca ficar mais larga ou mais alta,
a caixa não muda — muda a escala que a preenche — e a composição da aplicação
mantém-se. É a diferença entre guardar o resultado e guardar a intenção.

Ficheiros que ainda tenham a assinatura antiga são migrados na primeira
passagem e marcados; a partir daí é o marcador que manda.

**Verificado como deve ser**, e não por leitura do código: alterei
deliberadamente `BOLT_D` numa cópia e reexecutei. As dez aplicações contêm a
coordenada nova. Duas execuções seguidas redesenham as dez, todas as vezes.

## v0.5.1 — resíduos históricos

Pranchas e READMEs que continuavam a contar a história antiga ao lado de tokens
já em 0.5:

- `applications/README.md` e `powerfarm-application-tokens.json` mandavam
  substituir pelo "authoritative source vector". Agora descrevem o gerador e os
  atributos que não se devem apagar.
- A prancha de aplicações dizia "WORKING TRACED LOGO MASTER SHOWN".
- A prancha de cor dizia "VERSION 0.1" e tratava o âmbar como "proposed
  restrained accent". Agora traz a regra de superfície e os dois números.
- A prancha de tipografia dizia "No font files included" com os WOFF2 dentro
  do pacote.
- Os READMEs de módulo tinham versões próprias — v0.1, v0.2 — que nunca
  acompanharam o pacote. Foram removidas: um README a dizer v0.1 ao lado de
  tokens a dizer 0.5 é uma contradição sem função.

## v0.5.1 — higiene de release

A implementação já era v0.5.1, mas o pacote ainda se identificava internamente como v0.5. A higiene desta patch fecha essa discrepância:

- a raiz do pacote passa a ser `POWERFARM-Brand-System-v0.5.1/`;
- o manual fonte e o PDF passam a usar `v0.5.1` no nome, capa, cabeçalho e metadata;
- os nove JSONs de tokens/builders passam de `0.5` para `0.5.1`;
- a prancha de cor passa a mostrar `VERSION 0.5.1`;
- a nota de cor deixa de pedir confirmação contra um vector original inexistente e passa a apontar para os tokens do pacote + aprovação do titular;
- o manual deixa de listar licenciamento de fontes e um novo vector autoritativo como blockers de v1.0;
- a prancha de aplicações passa a pedir aprovação do titular e prova técnica do meio, em vez de sugerir que falta outro logo;
- o changelog da v0.5 volta a ser histórico, e esta patch recebe o seu próprio changelog.

Os blockers restantes para v1.0 são os três já definidos pelo sistema: proveniência para registo de marca, testes físicos de produção e aprovação do titular.
