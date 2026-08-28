# POWERFARM Brand System — v0.5

Uma coisa só: **o símbolo deixou de ser um traçado e passou a ser um master
geométrico**, gerado a partir de uma fonte única de onde tudo o resto deriva.

---

## O problema, dito com precisão

Havia doze descrições da mesma marca. Oito ficheiros de logo, cada um com o seu
path. Dez aplicações, cada uma com uma cópia embutida. Nenhuma delas era a
fonte. Corrigir a marca significava corrigir doze ficheiros e esperar que
ninguém se esquecesse de um.

E as doze descreviam um traçado automático — o registo do que os pixels calharam
fazer, incluindo o que nunca foi intencional.

## O que se fez

Mediu-se o raster: rectas ajustadas às arestas, círculos ajustados aos cantos,
transformada de distância para a espessura. Depois reconstruiu-se a forma a
partir das coordenadas.

**A descoberta que mudou o desenho: o topo não é um vértice.** O invólucro tem
uma aresta horizontal — o ápice está truncado, com um canto arredondado de cada
lado. Não se vê porque o raio atravessa exactamente o meio dessa aresta e
parte-a em duas. Por isso a marca são três formas, não duas.

A primeira tentativa desenhou um ápice pontiagudo. O mapa de diferença acusou um
bloco sólido de erro no topo inteiro, e foi isso que mandou olhar de perto.

**A forma está numa grelha de 64.** Escalando o invólucro para 896 de largura:

| | valor | módulos |
|---|---|---|
| largura na cinta | 896 | 14u |
| altura até ao ápice teórico | 448 | 7u |
| truncatura do ápice | 192 | 3u |
| aresta de topo resultante | 384 | 6u |
| altura abaixo da cinta | 512 | 8u |
| altura total | 768 | 12u |

Seis medições independentes, todas múltiplas do mesmo módulo, nenhuma com mais
de 1,4 px de desvio. Não acontece por acaso. O desenho original foi construído
sobre uma grelha; o traçado perdeu-a; a medição recuperou-a. As arestas
superiores dão 45° exactos.

**O que era irregular e saiu:** inclinação de 6 px entre os vértices laterais,
torção de 3,8 px no eixo vertical, arestas superiores a discordar entre si em
1,27°, e espessura a variar 8 px conforme o ponto de medição.

**O que se regularizou mas se manteve:** os cantos vêm em dois grupos — pontas a
23–26 px, cantos de topo a 30–31 px. Raio maior no canto obtuso é correcção
óptica normal, por isso ficam dois raios (40 e 48) em vez de um. A dispersão
dentro de cada grupo era ruído e desapareceu.

**O que não se tocou:** o raio não tem simetria de rotação — o extremo esquerdo
está 12 px abaixo do centro, o direito 56 px acima. Impor simetria moveria dois
vértices mais de 20 px. Isso muda o carácter da marca em vez de corrigir, e não
é uma decisão que a medição possa tomar.

IoU 0,930 contra o original realinhado. O resíduo é a franja fina onde vive a
irregularidade do próprio original.

## Fonte única

`logo/geometria.py` é onde a marca existe como números. `logo/gerar.py` escreve
tudo o resto: dez ficheiros de logo e as dez aplicações que embutem o símbolo,
recalculando cada transformação para a marca ficar no mesmo sítio e do mesmo
tamanho. As composições não se mexeram; só a forma é que passou a ser a boa.

```bash
python3 logo/gerar.py
```

Mudar a marca é mudar um número e correr isto.

Nota de implementação, porque custou: a primeira versão da propagação usava
expressões regulares e partiu os dez ficheiros. Estes SVG têm grupos dentro de
grupos, e um `</g>` não fecha necessariamente o `<g>` que interessa. Agora usa
um parser de XML.

## O wordmark

Testou-se primeiro se as letras vinham de alguma fonte, para o wordmark passar a
derivar de um ficheiro licenciado em vez de um traçado. Montserrat, Poppins,
Raleway e Archivo Black, pesos 700 a 900, procurando o tamanho e o tracking de
melhor encaixe. O melhor resultado ficou em IoU 0,82 e com o aspecto errado.

**Não é nenhuma delas: é lettering desenhado à mão.** Continua a ser um activo
traçado, e a nota de origem mantém-se.

Mas o traçado foi refeito. Tinha 196 pontos e as curvas eram polígonos — passo
mediano de 9,2 px numa largura de 1006. Invisível num cartão, visível como
facetado num painel de fachada. Agora são 164 segmentos de Bézier ajustados ao
raster: IoU 0,952 contra 0,809 do traçado anterior.

Também aqui a fonte importa: ajustar curvas ao traçado seria ajustá-las às
facetas que se quer remover. Parte-se do raster.

## Espaço livre

Passa a ser **1u — um módulo, escalado com a marca**. Antes era "a altura da
travessa do raio", que ninguém consegue medir num ficheiro.

---

## Por fechar para a v1.0

1. **Proveniência para registo de marca.** Medir um raster não prova quem
   desenhou primeiro. O registo quer a arte do próprio titular e uma cadeia de
   proveniência. Isto não é uma questão de qualidade do desenho — o desenho está
   resolvido — é de prova.

2. **Testes de produção.** Nenhuma aplicação física foi provada.

3. **Aprovação do titular.**

E uma pergunta em aberto sobre a própria marca: a assimetria do raio é
intencional ou é anterior ao raster? Só quem conhece a história responde.

---

## Correcções encontradas em revisão

Três defeitos apanhados a rever o pacote fechado, todos corrigidos aqui.

**O símbolo estava fora do eixo nos lockups.** Uma substituição global no
gerador trocou o nome da constante de largura pelo da altura. Como a marca não
é quadrada — 866,5 × 882, porque os cantos arredondados puxam os lados para
dentro — o símbolo ficava 7,75 unidades à esquerda do centro do wordmark. Meio
por cento; ninguém veria, e estaria errado à mesma. Verificado agora por
medição do render: os dois centros coincidem.

**`geometria.py` prometia mais do que cumpria.** Dizia "mudar a marca é mudar
um número neste ficheiro". Não é: os paths estão resolvidos e os parâmetros que
os produzem vivem em `reconstrucao/construir-simbolo.py`. São dois níveis, e o
cabeçalho passa a dizer isso e a listar os quatro passos. O erro era exactamente
o que este trabalho existe para evitar — um documento a descrever um sistema que
não é o que está lá.

**As proporções dos lockups mudaram e isso não estava dito.** O empilhado
mexeu 2%. O horizontal mexeu 31%, porque o ficheiro antigo tinha entre símbolo
e wordmark um intervalo de 1,5× a largura do próprio símbolo — o que parece
erro e não decisão. Passou a 2u. Está agora escrito no manual, com a nota de
que é esta a alteração a rejeitar se o intervalo era intencional.

Os changelogs da v0.3 e v0.4 levam um aviso de que são registos históricos, e a
entrada da v0.4 que dizia o vector do logo estar por resolver aponta agora para
onde foi resolvido.
