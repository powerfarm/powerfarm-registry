# POWERFARM logo — source status

## The symbol: geometric master

`geometria.py` holds the mark, and `gerar.py` writes every logo file, every
application that embeds it, and the symbol the registry publishes. None of
those is edited by hand.

The chain has two levels and it is worth knowing which is which. `geometria.py`
carries the resolved paths; the parameters that produce them live in
`reconstrucao/construir-simbolo.py`. Changing the geometry means editing the
parameter, regenerating the paths, pasting them into `geometria.py`, and then
running `gerar.py`. The header of `geometria.py` spells out the four steps.

The geometry was recovered by measuring the raster reference — straight lines
fitted to the edges, circles fitted to the corners, a distance transform for the
stroke weight. It is not a trace. The measurement found the grid the original
was built on: enclosure 14u wide, upper edges at exactly 45°, apex truncated by
3u leaving a 6u flat top, 8u below the girdle, on a 64 unit module. Six
independent dimensions, all multiples of the same unit, none deviating more than
1.4 px.

It also found what was never intentional, and removed it: a 6 px tilt between
the side vertices, a 3.8 px skew in the vertical axis, upper edges disagreeing
by 1.27°, and a stroke that varied by 8 px depending where you measured.

Full reasoning, measurements, and a difference map: `reconstrucao/README.md`.

## The wordmark: traced, now in curves

The wordmark is hand-drawn lettering, not type. This was tested rather than
assumed: Montserrat, Poppins, Raleway and Archivo Black were compared at weights
700–900, searching for the size and tracking of best fit. The best result
reached IoU 0.82 with the wrong aspect ratio. It is not a font.

So it stays a traced asset — but the trace was rebuilt. The old one had 196
points and its curves were polygons, with a median step of 9.2 px across a
1006 px width. Invisible on a business card, visible as faceting on a façade
sign. It is now 164 Bézier segments fitted to the raster, IoU 0.952 against
0.809 for the old trace.

Regenerate with `python3 logo/refazer-wordmark.py`.

## What still needs a designer

**Trademark registration.** A measurement of a raster is a better description of
that raster, but it is not independent evidence of what was drawn first. It
cannot establish authorship or priority. Registration needs the mark as the
owner drew it, with a provenance chain.

**Fabrication that cuts from the outline.** The symbol is now good enough to
send, and a human should still check optical weight at small sizes and corner
radii against the actual tool before anything is milled, cut, or embroidered.

**One open question about the mark itself.** The bolt is not rotationally
symmetric — the left extreme sits 12 px below centre, the right 56 px above.
Most bolt marks are symmetric. The reconstruction kept the asymmetry, because
imposing symmetry would move two vertices by more than 20 px and that changes
the mark's character rather than correcting it. Whether the asymmetry is
intentional or predates the raster is not something measurement can answer.
