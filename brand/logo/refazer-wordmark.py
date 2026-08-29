#!/usr/bin/env python3
"""Refaz o wordmark POWERFARM com curvas, a partir do tracado poligonal.

Porque: o wordmark tinha 196 pontos para dez letras. Os O, os R e os A eram
poligonos — passo mediano de 9.2 px numa largura de 1006. A 100 mm num cartao
ninguem ve; num painel de fachada a 3 m ve-se o facetado. Uma marca que diz
"engenharia de precisao" nao pode ter letras com arestas.

Testei primeiro se as letras eram de alguma fonte conhecida, para o wordmark
passar a derivar de um ficheiro licenciado em vez de um tracado. Comparei
Montserrat, Poppins, Raleway e Archivo Black em pesos 700 a 900, procurando o
tamanho e o tracking de melhor encaixe. O melhor resultado ficou em IoU 0.82 e
com o aspecto errado. Nao e nenhuma delas: e lettering desenhado a mao. Fica
como tracado, e a nota de origem mantem-se.

O que se faz entao: extrai-se o contorno a alta resolucao, detectam-se os cantos
verdadeiros pela curvatura, e ajustam-se cubicas aos trocos entre cantos. Os
cantos ficam cantos; as curvas ficam curvas.
"""
import pathlib
import re

import cv2
import numpy as np

AQUI = pathlib.Path(__file__).parent
# A fonte e o RASTER, nao o SVG tracado. Ajustar curvas ao tracado seria
# ajusta-las as facetas do tracado — o defeito que se quer remover. O raster
# tem as curvas verdadeiras; e dele que se parte, tal como no simbolo.
FONTE_RASTER = "_wordmark-raster.png"
RASTER_LARG = 1006            # medido
ESCALA = 4                    # sobreamostragem para extrair o contorno
LARG, ALT = 514, 66           # espaco de saida do wordmark
ERRO_MAX = 0.6                # tolerancia do ajuste, em unidades de saida
LIMIAR_CANTO = 55             # graus; acima disto e canto e nao curva


def contornos_alta_resolucao(_ignorado=None):
    from PIL import Image
    im = Image.open(AQUI / FONTE_RASTER).convert("L")
    # sobreamostrar com interpolacao suave antes de limiarizar: e isto que
    # devolve a curva por baixo dos pixels, em vez de a escada dos pixels
    im = im.resize((LARG * ESCALA, ALT * ESCALA), Image.LANCZOS)
    m = np.array(im)
    _, b = cv2.threshold(m, 128, 255, cv2.THRESH_BINARY)
    cs, jer = cv2.findContours(b, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    return [c.reshape(-1, 2).astype(float) for c in cs if len(c) > 20], jer


def suaviza(p, janela=13):
    """Media movel circular: tira o degrau do pixel sem mover os cantos."""
    n = len(p)
    k = np.ones(janela) / janela
    ext = np.vstack([p[-janela:], p, p[:janela]])
    s = np.column_stack([np.convolve(ext[:, i], k, mode="same")
                         for i in range(2)])
    return s[janela:janela + n]


def cantos(p, passo=6):
    """Vertices onde a direccao muda mais do que LIMIAR_CANTO graus."""
    n = len(p)
    idx = []
    for i in range(n):
        a = p[i] - p[(i - passo) % n]
        b = p[(i + passo) % n] - p[i]
        na, nb = np.linalg.norm(a), np.linalg.norm(b)
        if na < 1e-9 or nb < 1e-9:
            continue
        ang = np.degrees(np.arccos(np.clip(np.dot(a, b) / (na * nb), -1, 1)))
        if ang > LIMIAR_CANTO:
            idx.append((ang, i))
    # nao-maximos: fica so o mais agudo de cada aglomerado
    idx.sort(key=lambda t: -t[0])
    escolhidos = []
    for ang, i in idx:
        if all(min(abs(i - j), n - abs(i - j)) > passo * 2 for j in escolhidos):
            escolhidos.append(i)
    return sorted(escolhidos)


def ajusta_cubica(pts, t1, t2):
    """Cubica de Bezier por minimos quadrados, com tangentes impostas."""
    n = len(pts)
    if n < 3:
        return None
    d = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    u = np.concatenate([[0], np.cumsum(d)])
    if u[-1] < 1e-9:
        return None
    u = u / u[-1]
    p0, p3 = pts[0], pts[-1]
    b1 = 3 * u * (1 - u) ** 2
    b2 = 3 * u ** 2 * (1 - u)
    b0 = (1 - u) ** 3
    b3 = u ** 3
    A = np.zeros((2, 2))
    C = np.zeros(2)
    a1 = np.outer(b1, t1)
    a2 = np.outer(b2, t2)
    r = pts - (np.outer(b0, p0) + np.outer(b3, p3))
    A[0, 0] = (a1 * a1).sum(); A[0, 1] = (a1 * a2).sum()
    A[1, 0] = A[0, 1];         A[1, 1] = (a2 * a2).sum()
    C[0] = (a1 * r).sum();     C[1] = (a2 * r).sum()
    det = A[0, 0] * A[1, 1] - A[0, 1] * A[1, 0]
    if abs(det) < 1e-12:
        alfa = beta = np.linalg.norm(p3 - p0) / 3
    else:
        alfa = (C[0] * A[1, 1] - A[0, 1] * C[1]) / det
        beta = (A[0, 0] * C[1] - C[0] * A[1, 0]) / det
    lim = np.linalg.norm(p3 - p0)
    alfa = float(np.clip(alfa, lim * 0.02, lim * 1.2))
    beta = float(np.clip(beta, lim * 0.02, lim * 1.2))
    return p0, p0 + t1 * alfa, p3 + t2 * beta, p3


def erro(pts, bez):
    p0, p1, p2, p3 = bez
    t = np.linspace(0, 1, max(len(pts), 12))[:, None]
    c = ((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1
         + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3)
    from scipy.spatial import cKDTree
    return cKDTree(c).query(pts)[0].max()


def troco_para_curvas(pts, profundidade=0):
    """Ajusta uma cubica; se nao chegar, parte ao meio e tenta outra vez."""
    if len(pts) < 4:
        return [("L", pts[-1])]
    t1 = pts[min(3, len(pts) - 1)] - pts[0]
    t2 = pts[max(-4, -len(pts))] - pts[-1]
    n1, n2 = np.linalg.norm(t1), np.linalg.norm(t2)
    if n1 < 1e-9 or n2 < 1e-9:
        return [("L", pts[-1])]
    bez = ajusta_cubica(pts, t1 / n1, t2 / n2)
    if bez is None:
        return [("L", pts[-1])]
    if erro(pts, bez) <= ERRO_MAX * ESCALA or profundidade >= 3:
        return [("C", bez[1], bez[2], bez[3])]
    meio = len(pts) // 2
    return (troco_para_curvas(pts[:meio + 1], profundidade + 1)
            + troco_para_curvas(pts[meio:], profundidade + 1))


def n(v):
    return f"{v / ESCALA:.2f}".rstrip("0").rstrip(".")


def construir():
    cs, _ = contornos_alta_resolucao()
    partes = []
    total_pontos = 0
    for c in cs:
        s = suaviza(c)
        cn = cantos(s)
        if len(cn) < 2:
            cn = [0, len(s) // 2]
        d = [f"M {n(s[cn[0]][0])},{n(s[cn[0]][1])}"]
        for i in range(len(cn)):
            a, b = cn[i], cn[(i + 1) % len(cn)]
            troco = s[a:b + 1] if b > a else np.vstack([s[a:], s[:b + 1]])
            for seg in troco_para_curvas(troco):
                if seg[0] == "L":
                    d.append(f"L {n(seg[1][0])},{n(seg[1][1])}")
                else:
                    _, p1, p2, p3 = seg
                    d.append(f"C {n(p1[0])},{n(p1[1])} {n(p2[0])},{n(p2[1])} "
                             f"{n(p3[0])},{n(p3[1])}")
                total_pontos += 1
        d.append("Z")
        partes.append(" ".join(d))
    caminho = " ".join(partes)
    (AQUI / "_wordmark-limpo.path").write_text(caminho, encoding="utf-8")
    print(f"contornos: {len(cs)}   segmentos: {total_pontos}   "
          f"bytes: {len(caminho)}")
    return caminho


if __name__ == "__main__":
    construir()
