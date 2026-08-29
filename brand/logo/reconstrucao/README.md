# POWERFARM symbol — geometric reconstruction

**Status: candidate master. Not a replacement for a designer redraw.**

Read the last section before using this anywhere that matters.

---

## What this is

The logo masters in the brand package were auto-traced from a raster. Tracing
records whatever the pixels happened to do, including the parts that were never
intentional. This is an attempt to recover what the shape was *meant* to be, by
measuring the raster and then rebuilding the mark from coordinates.

Nothing here was traced. Every number below was measured — straight lines fitted
to the edges, circles fitted to the corners, a distance transform for the stroke
weight — and then regularised onto an integer grid.

Files:

```
simbolo-geometrico.svg    the reconstructed mark, 1024 artboard
simbolo-construcao.svg    construction sheet: grid, module, key dimensions
construir-simbolo.py      the script that generates it, with every measurement
comparacao.png            original / reconstruction / difference, side by side
```

---

## What the measurements found

### The top is not a vertex

This is the thing that changes the drawing. The enclosure is not a diamond with
four points — it has a **flat top edge**. The apex is truncated, and the cut has
a rounded corner on each side.

It is invisible in the finished mark because the bolt passes straight through
the middle of that edge and splits it in two. Zoom into the raster and both
corners are plainly there. A contour count confirms it: the mark is **three
separate shapes**, not two.

The first version of this reconstruction drew a pointed apex. The difference
map showed a solid block of error across the whole top. That is what sent me
back to look.

### The shape sits on a 64-unit grid

Scaled so the enclosure is 896 wide, every principal dimension lands on a
multiple of 64:

| Dimension | Value | Modules |
|---|---|---|
| Width at the girdle | 896 | 14u |
| Height to the theoretical apex | 448 | 7u |
| Apex truncation | 192 | 3u |
| Resulting flat top edge | 384 | 6u |
| Height below the girdle | 512 | 8u |
| Total height | 768 | 12u |

Six independent measurements, all multiples of the same module, none deviating
more than 1.4 px in the raster. That does not happen by chance — the original
drawing was built on a grid. The trace lost it. The measurement recovers it.

The upper edges come out at 45° exactly: half-width 283.6 px against apex height
284.4 px, a 0.3% deviation. The outer proportion is 14:12, or 7:6.

### What was irregular

These are the tracing and hand-drawing artefacts. The reconstruction removes
them:

- **Tilt.** The left vertex sits 6.0 px lower than the right.
- **Skew.** The top axis is 3.8 px left of the bottom axis.
- **Inconsistent edge angles.** Upper edges measure 44.59° and 45.86° — a 1.27°
  disagreement between two edges that should mirror each other.
- **Variable stroke.** Perpendicular weight measures 34.9 to 35.4 px depending
  where you sample; the horizontal cross-section swings from 44 to 52 px.
- **Unequal corner radii.** The two side vertices fit circles of 23.1 and
  25.8 px — a 12% spread on corners that should match.

### What was regularised but kept

**The corner radii come in two groups, and that looks deliberate.** The side
vertices fit 23.1 and 25.8 px; the two top corners fit 30.5 and 31.4 px. The
groups separate cleanly. A larger radius on the obtuse corner and a smaller one
on the acute corner is a normal optical correction — a shallow corner reads as
tighter than it is. So the reconstruction keeps two radii (40 and 48 on the
canonical grid) rather than flattening them to one. The scatter *within* each
group is trace noise and is gone.

**The bolt is not rotationally symmetric, and it stays that way.** Checked
directly: the left extreme sits 12 px below centre, the right extreme 56 px
above. Most lightning-bolt marks have 180° symmetry, and imposing it here would
have moved two vertices by more than 20 px. That is a change of character, not a
correction, and it is not mine to make. Only the anchor positions were cleaned —
the two horizontal edges are now exactly horizontal, and every point is an even
integer.

### Derived values

| Parameter | Raster | Canonical | Method |
|---|---|---|---|
| Stroke weight | 34.0 px | 54 | distance transform |
| Corner radius, points | 23.1 / 25.8 px | 40 | circle fit, residual 0.4–0.8 px |
| Corner radius, top | 30.5 / 31.4 px | 48 | circle fit, residual 0.7–1.6 px |
| Bolt clearance | 23.0 px | 36 | distance from bolt to enclosure |

---

## How close it is

**IoU against the realigned original: 0.930.**

The residual is a thin fringe along the edges, which is exactly where the
original's own irregularity lives — the reconstruction cannot match a tilt and a
straight axis at the same time. See `comparacao.png`. Side by side at size, the
wobble in the original's edges is visible; in the reconstruction it is gone.

Arcs are emitted as polylines at 64 segments per quadrant. Error is under 0.01
units on a 1024 artboard — invisible at any production scale, and safe in any
importer, including CAD and cutting software that chokes on Bézier arcs.

---

## What this does not solve

**This is still derived from the raster.** A measurement of a trace is a better
description of the raster than the trace was, but it is not independent
evidence of what the designer drew. It cannot establish authorship or priority.

For **trademark registration**, this is not sufficient. Registration wants the
mark as the owner drew it, with a provenance chain. Reconstructing it from a
JPEG-adjacent bitmap does not create one.

For **fabrication**, this is a large improvement and still wants a human pass. A
designer should check the optical weight at small sizes, the corner radii
against the actual cutting tool, and whether the bolt's asymmetry is intended or
is an artefact that predates the raster. Only someone who knows the mark's
history can answer that last one.

What it is good for, right now: every digital use, every layout in the brand
package, and as the starting point a designer works *from* rather than
re-deriving. It is honest about being a reconstruction, and it is on a grid, so
the next person can argue with specific numbers instead of eyeballing curves.
