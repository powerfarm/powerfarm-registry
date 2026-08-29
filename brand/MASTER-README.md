# POWERFARM Brand System v0.5.1

Vector-first brand system and modular source assets.

**v0.5.1 stabilizes the v0.5 geometric-master release.** It fixes durable propagation of the symbol into applications, removes stale documentation, and synchronizes the package version markers. Full detail in `CHANGELOG-v0.5.1.md`. v0.5 introduced the geometric master; v0.4 documented the tint ramp, resolved font licensing, and replaced the stale manual.

## Source status, in two lines

**The symbol is measured, not traced.** The grid the original was drawn on was
recovered — 64 unit module, 45° upper edges, truncated apex — and the
hand-drawing artefacts were removed. **The wordmark is hand-drawn lettering**,
confirmed against four candidate typefaces, so it stays a traced asset, though
the trace was rebuilt in real Bézier curves.

Neither is sufficient for trademark registration: measuring a raster does not
prove who drew it first. See `logo/SOURCE-STATUS.md`.

## Package structure

```
POWERFARM-Brand-Manual-v0.5.1.pdf   the manual — generated, not hand-written
POWERFARM-Brand-Manual-v0.5.1.md    its source
build-manual.py                   regenerates the PDF from the source
CHANGELOG-v0.5.1.md               propagation fix + release hygiene
CHANGELOG-v0.5.md                 the symbol became a geometric master
CHANGELOG-v0.4.md                 tint ramp, font licensing, manual
CHANGELOG-v0.3.md                 the first corrective release
_verification/                    render proofs for the v0.3 fixes
logo/geometria.py                 THE SOURCE — the mark as numbers
logo/gerar.py                     regenerates every logo file and application
logo/reconstrucao/                how the geometry was recovered, with proof
color/                            palette, contrast table, tint ramp, CSS
typography/                       type system, faux-bold guard, OFL licences
graphic-elements/                 10 recolourable motif SVGs
patterns/                         6 dark tiles + 6 cream tiles + CSS
iconography/                      12 icons, 64x64, four working colour states
imagery/                          genesis prompt, recipes, negatives, builder
layout/                           10 layout masters + responsive CSS
applications/                     10 application templates + email signature
```

## The mark comes from one file

`logo/geometria.py` holds the mark as numbers. `logo/gerar.py` writes the ten
logo files and patches the ten applications that embed the symbol. There is no
second copy to forget.

```bash
python3 logo/gerar.py             # all logo files + all applications
python3 logo/refazer-wordmark.py  # rebuild the wordmark curves from the raster
```

Applications carry the symbol inside a group marked `data-pf-symbol`, with
`data-pf-box` recording the optical rectangle it should fill in that
application's own coordinates. The generator rewrites the contents of those
groups on every run. **Do not remove those attributes** — without them the
application drops out of the chain silently, which is exactly how the first
version of this failed.

Do not hand-edit a logo SVG or a symbol inside a template. It will be
overwritten, and worse, it will be right for a while first.

## Three rules worth knowing before you start

**Amber is surface-dependent.** Energy Amber `#FFB02E` scores 1.42:1 on cream
and is unreadable there. Use Amber Deep `#A96600` for amber text, icons, and
thin rules on light surfaces.

**Tints are structure, never accent.** `--pf-tint-05` to `--pf-tint-80` are
cream mixed into black in 5% steps. They fill panels, draw dividers, and mute
captions. They never stand in for amber, and below `tint-55` they must not
carry text on black. Contrast for every stop is in the colour tokens.

**Colour states need inline SVG.** Icons and graphic elements recolour through
`currentColor`. An SVG loaded via `<img>` or `background-image` cannot inherit
colour and needs a pre-coloured copy.

```html
<svg class="pf-icon pf-icon--accent"> … </svg>
```

## Rebuilding the manual

```bash
python3 build-manual.py
```

Reads the markdown source and the token files, embeds Anton and Inter from
their OFL files, writes the PDF. No network needed.

Do not edit the PDF by hand. The reason the v0.2 render survived two releases
past its expiry is that nothing tied it to the files it described.

## Versioning

Semantic working versions while the system evolves: v0.1 → v0.5.1.

v1.0 needs three things, and only three: trademark provenance (the owner's own
artwork, not a measurement of a raster), physical production tests, and
brand-owner approval.
