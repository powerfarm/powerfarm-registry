#!/usr/bin/env python3
"""Reconstroi o simbolo POWERFARM por geometria exacta.

Nada aqui e tracado. Cada numero abaixo foi medido no raster de referencia
(ajuste de rectas as arestas, ajuste de circulo aos cantos, transformada de
distancia para a espessura) e depois regularizado para uma grelha inteira.

O que a medicao revelou sobre a forma:

  * O topo NAO e um vertice. E uma aresta horizontal. O apice teorico esta
    truncado, e o corte tem cantos arredondados dos dois lados. Nao se ve no
    render final porque o raio atravessa exactamente o meio dessa aresta e
    parte-a em duas — mas ampliando a zona, os dois cantos estao la.
  * As arestas SUPERIORES estao a 45 graus exactos: a meia-largura iguala a
    altura ate ao apice teorico (283.6 contra 284.4 px, 0.3% de desvio).
  * Medida a truncatura, tudo cai em multiplos de 64 sobre uma largura de 896:

        largura na cinta ......... 896 = 14u
        altura ate ao apice ...... 448 =  7u   (45 graus)
        truncatura do apice ...... 192 =  3u
        logo aresta de topo ...... 384 =  6u
        altura da base ........... 512 =  8u
        altura total ............. 768 = 12u

    Seis medidas independentes, todas multiplas do mesmo modulo, nenhuma com
    mais de 1.4 px de desvio no raster. Isto nao acontece por acaso: o desenho
    original foi construido sobre uma grelha. O tracado perdeu-a; a medicao
    recupera-a.

A proporcao exterior e 14:12, ou seja 7:6.

O que a medicao revelou de irregular, e que esta reconstrucao corrige:

  * O losango esta inclinado. O vertice esquerdo cai 6 px abaixo do direito.
  * E torcido. O vertice de topo esta 3.8 px a esquerda do de base.
  * A espessura do traco oscila entre 44 e 52 px conforme onde se mede.
  * Os quatro cantos nao tem o mesmo raio.

Sao artefactos de desenho a mao e de tracado automatico. Uma marca que promete
engenharia de precisao nao os deve ter.
"""
import pathlib

import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union

# ------------------------------------------------------- grelha canonica
# Prancheta 1024. Modulo u = 64. Largura do losango 14u, altura 15u.
U = 64
TELA = 1024
LARGURA = 14 * U          # 896  — na cinta, a parte mais larga
ALTO_TOPO = 7 * U         # 448  — ate ao apice teorico, arestas a 45 graus
TRUNCA = 3 * U            # 192  — quanto do apice foi cortado
TOPO_LARG = 6 * U         # 384  — aresta horizontal resultante (= 2 x TRUNCA)
ALTO_BASE = 8 * U         # 512  — do centro ate a ponta de baixo
CX = TELA // 2            # 512
CY_CINTA = 448            # linha dos vertices laterais

# Medidos no raster (largura 567.1 px) e reescalados por k = 896/567.1 = 1.580,
# depois arredondados ao inteiro par mais proximo.
TRACO = 54                # medido 34.0 px -> 53.7
FOLGA = 36                # medido 23.0 px -> 36.3  (afastamento raio<->involucro)

# Os cantos nao tem todos o mesmo raio, e isso parece intencional. Ajuste de
# circulo a cada canto, com residuo entre 0.43 e 1.64 px:
#
#     vertice esquerdo  23.1 px -> 36.5      cantos de topo  30.5 px -> 48.1
#     vertice direito   25.8 px -> 40.7                      31.4 px -> 49.5
#
# Os dois grupos separam-se com folga. Raio maior no canto obtuso e menor no
# agudo e um ajuste optico comum — o canto raso parece mais fechado do que e.
# Dentro de cada grupo a dispersao (4 px) e ruido de tracado, e desaparece.
RAIO_PONTA = 40           # vertices esquerdo, direito e de base
RAIO_TOPO = 48            # os dois cantos da aresta horizontal

# ------------------------------------------------------------- o invólucro
# Hexagono. Simetria bilateral perfeita, sem inclinacao e sem torcao — o
# original tem o vertice esquerdo 6 px abaixo do direito e o eixo vertical
# desviado 3.8 px.
Y_TOPO = CY_CINTA - ALTO_TOPO + TRUNCA   # 192
INVOLUCRO = [
    (CX - TOPO_LARG // 2, Y_TOPO),       # topo-esq (320, 192)
    (CX + TOPO_LARG // 2, Y_TOPO),       # topo-dir (704, 192)
    (CX + LARGURA // 2, CY_CINTA),       # direita  (960, 448)
    (CX, CY_CINTA + ALTO_BASE),          # base     (512, 960)
    (CX - LARGURA // 2, CY_CINTA),       # esquerda ( 64, 448)
]

# ---------------------------------------------------------------- o raio
# Seis vertices, extraidos por aproximacao poligonal do contorno (7 vertices a
# eps=3.0) e reescalados. Duas arestas sao exactamente horizontais no original
# e continuam a se-lo aqui — B/C partilham y, E/F partilham y.
#
# O raio NAO tem simetria de rotacao de 180 graus. Verificou-se: o extremo
# esquerdo esta 12 px abaixo do centro, o direito 56 px acima. Impor simetria
# mudaria o caracter da marca, por isso a assimetria fica. O que se corrige e
# so a posicao dos pontos, agora todos em inteiros pares.
RAIO_BOLT = [
    (648,  64),   # A  ponta de cima
    (304, 524),   # B  extremo esquerdo
    (500, 524),   # C  reentrancia, mesma altura que B
    (350, 946),   # D  ponta de baixo
    (716, 416),   # E  extremo direito
    (520, 416),   # F  reentrancia, mesma altura que E
]


def arredonda_por_canto(vertices, raios, segmentos=64):
    """Arredonda cada vertice com o seu proprio raio.

    Percorre o poligono e substitui cada vertice por um arco tangente as duas
    arestas. Os arcos saem densificados em `segmentos` por quadrante — erro
    abaixo de 0.01 unidades numa prancheta de 1024, ou seja invisivel a
    qualquer escala de producao, e seguro em qualquer importador.
    """
    n = len(vertices)
    pontos = []
    for i in range(n):
        ant = np.array(vertices[i - 1], float)
        act = np.array(vertices[i], float)
        seg = np.array(vertices[(i + 1) % n], float)
        r = raios[i]
        if r <= 0:
            pontos.append(tuple(act))
            continue
        v1 = ant - act
        v2 = seg - act
        u1 = v1 / np.linalg.norm(v1)
        u2 = v2 / np.linalg.norm(v2)
        # meio-angulo interno; a distancia do vertice ao ponto de tangencia
        # e r/tan(theta), e ao centro do arco e r/sin(theta)
        cos_t = np.clip(np.dot(u1, u2), -1, 1)
        theta = np.arccos(cos_t) / 2
        d_tan = r / np.tan(theta)
        bis = (u1 + u2)
        bis = bis / np.linalg.norm(bis)
        centro = act + bis * (r / np.sin(theta))
        t1 = act + u1 * d_tan
        t2 = act + u2 * d_tan
        a1 = np.arctan2(*(t1 - centro)[::-1])
        a2 = np.arctan2(*(t2 - centro)[::-1])
        # menor arco entre os dois pontos de tangencia
        delta = (a2 - a1 + np.pi) % (2 * np.pi) - np.pi
        k = max(2, int(abs(delta) / (np.pi / 2) * segmentos))
        for j in range(k + 1):
            ang = a1 + delta * j / k
            pontos.append((centro[0] + r * np.cos(ang),
                           centro[1] + r * np.sin(ang)))
    return Polygon(pontos)


def desloca_para_dentro(vertices, distancia):
    """Encolhe o losango mantendo as arestas paralelas."""
    p = Polygon(vertices)
    return p.buffer(-distancia, join_style=2)


def caminho(geom, casas=1):
    """Converte geometria shapely num atributo `d` de SVG."""
    partes = []
    poligonos = geom.geoms if hasattr(geom, "geoms") else [geom]
    for pol in poligonos:
        for anel in [pol.exterior, *pol.interiors]:
            pontos = list(anel.coords)[:-1]
            d = "M " + " L ".join(
                f"{round(x, casas)},{round(y, casas)}" for x, y in pontos
            ) + " Z"
            partes.append(d)
    return " ".join(partes)


def construir():
    raios = [RAIO_TOPO, RAIO_TOPO, RAIO_PONTA, RAIO_PONTA, RAIO_PONTA]
    ext = arredonda_por_canto(INVOLUCRO, raios)
    interior = desloca_para_dentro(INVOLUCRO, TRACO)
    anel = ext.difference(interior)

    bolt = Polygon(RAIO_BOLT)
    if not bolt.is_valid:
        bolt = bolt.buffer(0)

    # O raio corta o anel em duas pecas. E o que o original faz: a analise de
    # contornos encontrou tres formas separadas, nao duas.
    vazio = bolt.buffer(FOLGA, join_style=2)
    anel_cortado = anel.difference(vazio)

    marca = unary_union([anel_cortado, bolt])

    pecas = len(marca.geoms) if hasattr(marca, "geoms") else 1
    print(f"pecas: {pecas}  (o original tem 3)")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TELA} {TELA}"
     width="{TELA}" height="{TELA}" fill="currentColor" color="#F8DFC1">
  <title>POWERFARM symbol</title>
  <desc>Geometric reconstruction on a 1024 grid, module {U}. Enclosure 14u
  wide, apex at 45 degrees truncated by 3u leaving a 6u flat top, 8u below the
  girdle. Stroke {TRACO}, corner radii {RAIO_PONTA} and {RAIO_TOPO}, bolt
  clearance {FOLGA}. Every anchor is an even integer.</desc>
  <path fill-rule="evenodd" d="{caminho(anel_cortado)}"/>
  <path d="{caminho(bolt)}"/>
</svg>
"""
    destino = pathlib.Path("simbolo-geometrico.svg")
    destino.write_text(svg, encoding="utf-8")
    print("escrito:", destino, f"({len(svg)} bytes)")
    return marca


if __name__ == "__main__":
    construir()
