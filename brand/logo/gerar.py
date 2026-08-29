#!/usr/bin/env python3
"""Gera TODOS os ficheiros de logo a partir de uma unica fonte: a geometria.

Antes havia oito ficheiros de logo, cada um com o seu proprio path tracado, mais
onze copias do simbolo espalhadas pelas aplicacoes. Doze descricoes da mesma
marca, e nenhuma delas era a fonte. Corrigir a marca queria dizer corrigir doze
ficheiros e esperar que ninguem se esquecesse de um.

Agora ha uma fonte — `geometria.py`, onde a forma existe como numeros — e este
script escreve tudo o resto. Mudar a marca e mudar um numero e correr isto.

    python3 logo/gerar.py

Escreve:
    powerfarm-symbol-{master,black,cream}.svg
    powerfarm-wordmark-master.svg           (limpo, ver nota)
    powerfarm-stacked-{master,black,cream}.svg
    powerfarm-horizontal-{master,black,cream}.svg
    ../applications/svg/*.svg               (substitui o simbolo embutido)
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from geometria import (ANEL_D, BOLT_D, CAIXA, MARCA_ALT, MARCA_LARG,
                       MARCA_X, MARCA_Y, TELA, U)

AQUI = pathlib.Path(__file__).parent
PACOTE = AQUI.parent

CREME = "#F8DFC1"
PRETO = "#080702"

# ------------------------------------------------------------- proporcoes
# Derivadas do modulo, nao escolhidas a olho. Medidas no raster de referencia
# e arredondadas ao meio-modulo mais proximo; o desvio maximo foi 1.7%.
LARG_WORDMARK = 26 * U        # 1664
ALT_WORDMARK = 210            # imposta pelo aspecto do wordmark, 0.1264
FOLGA_EMPILHADO = 112         # 1.75u — medida no raster (109 apos escala)
FOLGA_HORIZONTAL = 2 * U      # 128


def simbolo_svg(cor=None, largura=None):
    """O simbolo sozinho, na prancheta canonica."""
    if cor is None:
        pintura = 'fill="currentColor" color="%s"' % CREME
    else:
        pintura = 'fill="%s"' % cor
    w = largura or TELA
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TELA} {TELA}"
     width="{w}" height="{w}" {pintura}>
  <title>POWERFARM symbol</title>
  <desc>{CAIXA}</desc>
  <path fill-rule="evenodd" d="{ANEL_D}"/>
  <path d="{BOLT_D}"/>
</svg>
'''


def _grupo_marca(escala, dx, dy):
    """A marca (anel + raio) transformada, sem prancheta."""
    return (f'<g transform="translate({dx:.4g},{dy:.4g}) scale({escala:.6g})">'
            f'<path fill-rule="evenodd" d="{ANEL_D}"/>'
            f'<path d="{BOLT_D}"/></g>')


def _wordmark_d():
    """O wordmark refeito em curvas.

    O tracado antigo tinha 196 pontos e as curvas eram poligonos — passo
    mediano de 9.2 px numa largura de 1006. Foi refeito a partir do raster,
    nao do tracado: ajustar curvas ao tracado seria ajusta-las as facetas que
    se quer remover. Agora sao 164 segmentos de Bezier, IoU 0.952 contra o
    raster onde o tracado antigo dava 0.809.

    Testei antes se as letras vinham de alguma fonte, para o wordmark passar a
    derivar de um ficheiro licenciado. Montserrat, Poppins, Raleway e Archivo
    Black, pesos 700 a 900, procurando tamanho e tracking de melhor encaixe: o
    melhor ficou em IoU 0.82 e com o aspecto errado. E lettering desenhado a
    mao, e continua a ser um activo tracado.

    Regerar com: python3 logo/refazer-wordmark.py
    """
    return (AQUI / "_wordmark-limpo.path").read_text(encoding="utf-8").strip()


def empilhado(cor=None):
    """Simbolo em cima, wordmark em baixo, centrados no mesmo eixo."""
    larg = LARG_WORDMARK
    alt = MARCA_ALT + FOLGA_EMPILHADO + ALT_WORDMARK
    # o simbolo centra-se sobre a largura do wordmark
    dx = (larg - MARCA_LARG) / 2 - MARCA_X
    grupo = _grupo_marca(1.0, dx, -MARCA_Y)
    esc_w = larg / 514.0
    wm = (f'<g transform="translate(0,{MARCA_ALT + FOLGA_EMPILHADO:.6g}) '
          f'scale({esc_w:.6g})"><path fill-rule="evenodd" d="{_wordmark_d()}"/></g>')
    pintura = (f'fill="currentColor" color="{CREME}"' if cor is None
               else f'fill="{cor}"')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {larg} {alt:.0f}"
     width="{larg}" height="{alt:.0f}" {pintura}>
  <title>POWERFARM stacked lockup</title>
  <desc>Symbol {MARCA_LARG} wide, gap {FOLGA_EMPILHADO}, wordmark {larg} wide.</desc>
  {grupo}
  {wm}
</svg>
'''


def horizontal(cor=None):
    """Simbolo a esquerda, wordmark a direita, centrados na vertical."""
    larg = MARCA_LARG + FOLGA_HORIZONTAL + LARG_WORDMARK
    alt = MARCA_ALT
    grupo = _grupo_marca(1.0, -MARCA_X, -MARCA_Y)
    esc_w = LARG_WORDMARK / 514.0
    y_wm = (alt - ALT_WORDMARK) / 2
    wm = (f'<g transform="translate({MARCA_LARG + FOLGA_HORIZONTAL},{y_wm:.6g}) '
          f'scale({esc_w:.6g})"><path fill-rule="evenodd" d="{_wordmark_d()}"/></g>')
    pintura = (f'fill="currentColor" color="{CREME}"' if cor is None
               else f'fill="{cor}"')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {larg} {alt}"
     width="{larg}" height="{alt}" {pintura}>
  <title>POWERFARM horizontal lockup</title>
  <desc>Symbol {MARCA_LARG} x {MARCA_ALT}, gap {FOLGA_HORIZONTAL}, wordmark {LARG_WORDMARK}.</desc>
  {grupo}
  {wm}
</svg>
'''


# ------------------------------------------------- aplicacoes que o embutem
# Cada aplicacao trazia o simbolo tracado dentro de um <g transform>, no espaco
# 258x261 do ficheiro antigo. Substitui-se o conteudo e recalcula-se a
# transformacao para a marca ficar exactamente do mesmo tamanho e no mesmo
# sitio — a composicao nao se mexe, so a forma e que passa a ser a boa.
ANTIGO_LARG, ANTIGO_ALT = 258.0, 261.0
ASSINATURA_ANTIGA = "M 184.00 36.00"

# O marcador que torna isto repetivel.
#
# A primeira versao procurava a assinatura do path antigo. Funcionou uma vez e
# so uma: depois da troca, a assinatura deixa de existir e o gerador ja nao
# reconhece a aplicacao. Correr o gerador segunda vez reportava "0 aplicacoes",
# o que parece idempotencia e nao e — mudar a geometria deixava de propagar.
# Uma migracao unica disfarcada de fonte unica, exactamente o defeito que esta
# arquitectura existe para eliminar.
#
# Agora cada grupo fica marcado. `data-pf-symbol` diz que ali dentro vive o
# simbolo, e `data-pf-box` guarda o rectangulo optico que ele deve ocupar nas
# coordenadas da propria aplicacao. A geometria la dentro e descartavel: cada
# execucao apaga-a e volta a desenhar a partir de `geometria.py`, ajustando a
# transformacao a caixa guardada.
#
# Isto sobrevive a alteracoes da forma. Se a marca ficar mais larga ou mais
# alta, a caixa nao muda — muda a escala que a preenche — e a composicao da
# aplicacao continua de pe.
MARCADOR = "data-pf-symbol"
CAIXA_ATTR = "data-pf-box"


def _transforma_para_caixa(cx, cy, larg):
    """Escala e desloca a marca para preencher uma caixa optica, centrada."""
    k = larg / MARCA_LARG
    tx = cx - k * (MARCA_X + MARCA_LARG / 2)
    ty = cy - k * (MARCA_Y + MARCA_ALT / 2)
    return k, tx, ty


def repropaga_aplicacoes():
    """Redesenha o simbolo em cada aplicacao. Repetivel, nao uma migracao.

    Usa um parser de XML e nao expressoes regulares: estes ficheiros tem grupos
    dentro de grupos, e um `</g>` nao fecha necessariamente o `<g>` que
    interessa. A primeira tentativa foi com regex e partiu os dez ficheiros.
    """
    import xml.etree.ElementTree as ET

    SVG = "http://www.w3.org/2000/svg"
    ET.register_namespace("", SVG)
    tocados = migrados = 0

    for f in sorted((PACOTE / "applications" / "svg").glob("*.svg")):
        arvore = ET.fromstring(f.read_text(encoding="utf-8"))
        alterou = False

        for g in arvore.iter():
            if not (g.tag.endswith("}g") or g.tag == "g"):
                continue
            caminhos = [e for e in g.iter()
                        if e.tag.endswith("}path") or e.tag == "path"]
            marcado = g.get(MARCADOR) is not None
            legado = any((e.get("d") or "").startswith(ASSINATURA_ANTIGA)
                         for e in caminhos)
            if not marcado and not legado:
                continue

            if marcado:
                cx, cy, larg = (float(v) for v in g.get(CAIXA_ATTR).split())
            else:
                # migracao: deduzir a caixa optica da colocacao antiga
                tr = g.get("transform", "")
                nums = re.findall(r"[-\d.]+", tr)
                x, y, esc = float(nums[0]), float(nums[1]), float(nums[2])
                larg = esc * ANTIGO_LARG
                cx = x + larg / 2
                cy = y + esc * ANTIGO_ALT / 2
                g.set(CAIXA_ATTR, f"{cx:.3f} {cy:.3f} {larg:.3f}")
                g.set(MARCADOR, "master")
                migrados += 1

            # a cor vem do fill dos paths que la estao; sem isto a marca herda
            # preto e desaparece nos fundos escuros
            pintura = next((e.get("fill") for e in caminhos if e.get("fill")),
                           None)
            k, tx, ty = _transforma_para_caixa(cx, cy, larg)

            for filho in list(g):
                g.remove(filho)
            g.set("transform", f"translate({tx:.3f},{ty:.3f}) scale({k:.6f})")
            for d, regra in ((ANEL_D, "evenodd"), (BOLT_D, None)):
                e = ET.SubElement(g, f"{{{SVG}}}path")
                e.set("d", d)
                if regra:
                    e.set("fill-rule", regra)
                if pintura:
                    e.set("fill", pintura)
            alterou = True

        if alterou:
            f.write_text(ET.tostring(arvore, encoding="unicode"),
                         encoding="utf-8")
            tocados += 1
    if migrados:
        print(f"  {migrados} grupo(s) migrado(s) para o marcador estavel")
    return tocados


def main():
    wm = _wordmark_d()
    saidas = {
        "powerfarm-wordmark-master.svg": (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 514 66"\n'
            f'     width="514" height="66" fill="currentColor" color="{CREME}">\n'
            f'  <title>POWERFARM wordmark</title>\n'
            f'  <path fill-rule="evenodd" d="{wm}"/>\n</svg>\n'),
        "powerfarm-symbol-master.svg": simbolo_svg(None),
        "powerfarm-symbol-cream.svg": simbolo_svg(CREME),
        "powerfarm-symbol-black.svg": simbolo_svg(PRETO),
        "powerfarm-stacked-master.svg": empilhado(None),
        "powerfarm-stacked-cream.svg": empilhado(CREME),
        "powerfarm-stacked-black.svg": empilhado(PRETO),
        "powerfarm-horizontal-master.svg": horizontal(None),
        "powerfarm-horizontal-cream.svg": horizontal(CREME),
        "powerfarm-horizontal-black.svg": horizontal(PRETO),
    }
    for nome, conteudo in saidas.items():
        (AQUI / nome).write_text(conteudo, encoding="utf-8")
        print(f"  escrito: logo/{nome}")
    n = repropaga_aplicacoes()
    print(f"\n{len(saidas)} ficheiros de logo, {n} aplicacoes redesenhadas.")
    print("Fonte: logo/geometria.py")


if __name__ == "__main__":
    main()
