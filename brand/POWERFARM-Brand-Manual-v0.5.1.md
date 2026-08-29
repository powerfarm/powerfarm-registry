# POWERFARM Brand Manual

**Version 0.5.1 — August 2026**

This manual is the human-readable layer of the POWERFARM Brand System. The
machine-readable layer — tokens, CSS, and SVG masters — ships alongside it in
the same package, and the two are generated from the same decisions. Where they
disagree, the token files win, and the disagreement is a bug worth reporting.

---

## 0. Read this first

Two things about this system are true and easy to miss.

**The symbol is a geometric master; the wordmark is still a trace.** The symbol
in `logo/` was rebuilt from measurement — the grid the original was drawn on was
recovered, and the hand-drawing artefacts were removed. It is generated from
`geometria.py`, which is the single source for the whole system. The wordmark is
hand-drawn lettering, confirmed not to be any common typeface, so it remains a
traced asset, though the trace was rebuilt in real curves.

Neither is sufficient for **trademark registration**: a measurement of a raster
is not independent evidence of what was drawn first. Fabrication that cuts from
the outline still wants a human pass. Details in `logo/SOURCE-STATUS.md`.

**Versions below 1.0 are working versions.** v0.5.1 is a stabilization patch, not a measure of how "finished" the brand is. Moving to v1.0 requires trademark provenance for the owner-approved mark, physical production tests, and brand-owner sign-off. Font licensing has been verified since v0.4, and the geometric symbol master is already the operational source for daily work. Until v1.0, treat every rule here as binding for daily work and revisable at a version boundary.

---

## 1. The mark

### Variants

| Variant | File | Use |
|---|---|---|
| Stacked | `logo/powerfarm-stacked-master.svg` | Default. Covers, signage, square formats. |
| Horizontal | `logo/powerfarm-horizontal-master.svg` | Headers, navigation bars, wide lockups. |
| Symbol | `logo/powerfarm-symbol-master.svg` | Avatars, favicons, equipment marking, repeated appearances where the name is already established. |
| Wordmark | `logo/powerfarm-wordmark-master.svg` | Rare. Where the symbol would be redundant or too small to hold its detail. |

The `-master` files carry `fill="currentColor"` and inherit colour from CSS.
The `-black` and `-cream` files are fixed-colour and are for contexts where
inheritance is not available: email, third-party platforms, print handoff.

### Construction

The symbol is built on a 1024 artboard with a 64 unit module. Everything derives
from that unit:

| | |
|---|---|
| Enclosure width at the girdle | 14u |
| Upper edges | 45° exactly |
| Apex truncation | 3u, leaving a 6u flat top |
| Height below the girdle | 8u |
| Stroke | 54 |
| Corner radii | 40 at the points, 48 at the top corners |

The top is a flat edge, not a vertex. The bolt passes through the middle of it
and splits it in two, which is why the mark is three shapes rather than two.

### Clear space and minimum size

**Clear space is 1u — one module, scaled with the mark.** At the symbol's
natural size that is 64 units on every side. Nothing enters it: not type, not
patterns, not image edges, not another logo.

Minimum sizes: symbol 24 px on screen and 8 mm in print; stacked lockup 96 px
and 25 mm; horizontal lockup 120 px and 32 mm. Below those, the enclosure's
stroke closes up and the bolt loses its notch.

**The lockup proportions changed in v0.5.** Both were rebuilt from the module
rather than inherited. The stacked lockup shifted by 2%, which nobody will
notice. The horizontal lockup changed by 31%: the old file carried a gap of
1.5× the symbol's own width between symbol and wordmark, which reads as an
error rather than a decision. It is now 2u. If that gap was deliberate, this is
the change to reject.

### Misuse

Do not recolour outside the palette, add effects of any kind, rotate, stretch,
skew, outline, re-space the wordmark, rebuild the lockup from parts, place the
mark on a busy pattern or a low-contrast image, or substitute a supporting
graphic element for the emblem. The energy bolt in `graphic-elements/` is a
motif, not a logo.

---

## 2. Colour

### Palette

| Name | Hex | Role |
|---|---|---|
| Powerfarm Black | `#080702` | Primary background |
| Powerfarm Cream | `#F8DFC1` | Primary identity colour |
| Energy Amber | `#FFB02E` | Accent — **dark surfaces only** |
| Amber Deep | `#A96600` | Amber for text, icons, and thin rules **on light surfaces** |
| Graphite | `#1A1A1A` | Panels and depth |
| Steel | `#4D4D4D` | Secondary text on cream; rules and dividers on dark |
| White | `#FFFFFF` | Utility neutral |

Target proportion: roughly 55% dark, 32% cream, 10% support grey, 3% amber.
Amber that stops being rare stops being an accent.

### The amber rule

Energy Amber on cream measures 1.42:1. That is not a marginal call; it is
invisible. On light surfaces, amber text, amber icons, and amber hairlines use
Amber Deep. Large solid decorative blocks may keep Energy Amber, because a
filled shape carries no legibility requirement.

### Measured contrast

| Pair | Ratio | Verdict |
|---|---|---|
| Cream on black | 15.66 | AA / AAA |
| Black on cream | 15.66 | AA / AAA |
| Amber on black | 11.04 | AA / AAA |
| Amber on graphite | 9.53 | AA / AAA |
| Steel on cream | 6.57 | AA |
| Amber Deep on cream | 3.56 | Large text only, 24 px+ |
| Steel on black | 2.39 | **Fails.** Rules and dividers only, never text |
| Energy Amber on cream | 1.42 | **Fails.** Never use |

Two of the eight fail. They are listed rather than omitted so that nobody
rediscovers them in production.

### The tint ramp — new in v0.4

A v0.3 audit found 26 distinct hex values in the package against 7 documented
ones. The extra 19 were not mistakes; they were derived tints inside layout and
application mockups, doing real work as panels, dividers, and muted labels. But
they were undocumented, which meant every new mockup invented its own.

They are now a ramp: **Powerfarm Cream mixed into Powerfarm Black in sRGB, in
5% steps**, exposed as `--pf-tint-05` through `--pf-tint-80`. Every previously
undocumented value has been snapped to its nearest step. The package now
contains zero undocumented colours.

| Token | Hex | On black | On cream |
|---|---|---|---|
| `--pf-tint-05` | `#14120C` | 1.08 | 14.55 |
| `--pf-tint-10` | `#201D15` | 1.20 | 13.07 |
| `--pf-tint-15` | `#2C271F` | 1.36 | 11.51 |
| `--pf-tint-20` | `#38322A` | 1.59 | 9.84 |
| `--pf-tint-25` | `#443D32` | 1.88 | 8.33 |
| `--pf-tint-30` | `#50483B` | 2.24 | 7.00 |
| `--pf-tint-35` | `#5C5344` | 2.66 | 5.88 |
| `--pf-tint-40` | `#685D4E` | 3.13 | 5.00 |
| `--pf-tint-45` | `#746858` | 3.71 | 4.22 |
| `--pf-tint-50` | `#807361` | 4.36 | 3.59 |
| `--pf-tint-55` | `#8C7E6B` | 5.10 | 3.07 |
| `--pf-tint-60` | `#988975` | 5.92 | 2.64 |
| `--pf-tint-65` | `#A4937E` | 6.77 | 2.31 |
| `--pf-tint-70` | `#B09E88` | 7.77 | 2.02 |
| `--pf-tint-75` | `#BCA991` | 8.85 | 1.77 |
| `--pf-tint-80` | `#C8B49B` | 10.04 | 1.56 |

On black, `tint-55` and lighter pass AA as body text; `tint-40` through
`tint-50` are large-text only; everything darker is structure and must never
carry words. On cream the ramp inverts.

Four tints have named roles so that mockups reach for meaning rather than
numbers: `--pf-panel-dark` (05), `--pf-divider-dark` (15),
`--pf-muted-on-dark` (55), `--pf-caption-on-dark` (65).

A tint is surface and structure. It is never a substitute for the accent and
carries no brand meaning on its own.

---

## 3. Typography

Anton for display. Inter for everything else.

| Step | Size |
|---|---|
| Display 2XL / XL / LG | 96 / 72 / 56 px |
| H1 / H2 / H3 | 40 / 32 / 24 px |
| Body Large / Body / Small | 18 / 16 / 14 px |
| Caption / Label | 12 / 11 px |

Leading: 0.92 display, 1.0 headings, 1.5 body. Display tracking −0.02em;
labels +0.08em, uppercase.

**Anton ships one weight and no italic.** Asking for bold or italic makes the
browser synthesise a fake one — precisely the distortion this manual forbids
elsewhere. `font-synthesis: none` is set globally and `.pf-display` is pinned
to weight 400. Display hierarchy comes from scale and case, never from weight.

Anton is for impact, not paragraphs. Inter carries functional and technical
content. Uppercase for major display lines and labels; sentence case for body.
Do not outline, stretch, skew, or faux-condense type, and do not add font
families without a functional reason.

**Licensing — resolved in v0.4.** Both families are published under the SIL
Open Font License 1.1, which permits embedding in documents, redistribution
inside a bundle, and use in physical fabrication. Two conditions apply: the
fonts may not be sold on their own, and a modified font may not keep its
reserved name. Neither constrains normal POWERFARM use. Copies of both licences
ship in `typography/licenses/`.

---

## 4. Graphic elements

Ten motifs in `graphic-elements/`: energy bolt, double slash, angular bracket,
technical corners, energy-flow lines, dot matrix, technical grid, directional
chevrons, energy bars, diagonal field.

The principle is controlled energy translated into structure. One dominant
gesture per composition. Reuse a small family of diagonal angles rather than
rotating motifs freely. Cropping large background graphics is encouraged.

No bevels, glows, shadows, metallic effects, or gradients. These are supporting
graphics, never alternate logos.

All ten use `fill="currentColor"` with a cream presentation-attribute default,
so `.pf-graphic--accent` and its siblings can recolour them.

---

## 5. Patterns

Six tiles, each shipping in a dark and a cream variant: micro chevrons, energy
slash field, technical grid, data dot field, energy flow topology, modular
brackets. All tile seamlessly and scale without rasterisation. In the cream
variants, Energy Amber is replaced by Amber Deep.

Scale up and reduce contrast for large environments — `.pf-pattern-lg`,
`.pf-pattern-xl`, `.pf-pattern-quiet`. Use micro chevrons, grids, or dots on
small UI surfaces; energy flow topology for process and motion stories; slash
fields or modular brackets for section transitions.

Never place a dense pattern directly behind the logo or behind headline space.

---

## 6. Iconography

Twelve icons on a 64×64 grid: energy, battery, plug, solar, grid,
sustainability, analytics, facility, maintenance, charging, monitoring, safety.
4 px stroke, square caps, bevel joins, outline-first.

Four colour states: default cream, accent Energy Amber for dark surfaces,
accent-light Amber Deep for light surfaces, and dark for light-background
export.

**Colour states require inline SVG.** An icon loaded through `<img>` or
`background-image` cannot inherit colour and needs a pre-coloured copy.

One colour per icon in normal use. Amber for emphasis, active states, warnings,
or highlighted metrics — not decoration. No shadows, gradients, or bevels.
Minimum 8 px clear area on the source grid. Never place these icons inside the
logo geometry. At very small sizes, simplify rather than shrink.

---

## 7. Layout

Layouts should feel structured, spacious, engineered, and decisive. One dominant
visual idea, one obvious reading order, clear grid alignment, room to breathe.

| Context | Columns | Gutter | Margin |
|---|---|---|---|
| Desktop | 12 | 24 px | 64 px |
| Tablet | 8 | 20 px | 40 px |
| Mobile | 4 | 16 px | 20 px |
| Presentation | 12 | 20 px | 60 px |
| Print / report | 6 | 18 px | 42 px |

Desktop content caps at 1440 px.

Left alignment is the default; prefer controlled asymmetry over centring. Hero
text occupies 30–40% of the composition. Split text and image 5/7 or 7/5. Use
diagonals as transitions or crops, not as everywhere-decoration. Cards inherit
the page grid. Crop oversized typography only while the word stays instantly
legible. Never stack multiple patterns, large icons, diagonal bands, and
oversized type into one small area.

Ten SVG layout masters ship in `layout/svg/`.

---

## 8. Imagery

Priority order: real photography when it is credible; generative imagery that
looks photographically plausible; abstract generative campaign imagery;
illustration only when the communication problem genuinely benefits.

Start from `imagery/powerfarm-imagery-genesis-prompt.md`, add one recipe from
the universal prompt library, and apply the negative constraint library. The
prompts are deliberately model-agnostic — no platform flags, model names, or
sampler settings — and describe subject, mood, composition, lighting, realism,
colour discipline, exclusions, and intended use.

The golden rule: POWERFARM imagery should look advanced because the engineering
is excellent, not because the picture is full of futuristic effects. No neon
cyberpunk grading, no holograms, no fantasy lightning, no decorative sparks, no
greenwashing symbolism, no impossible machinery, no unreadable fake labels.

---

## 9. Applications

Eleven templates covering business card, email signature specification and HTML
starter, social campaign pair, presentation cover and content, report cover,
website landing hero, facility signage, vehicle side graphic, apparel, and
equipment label.

Each medium carries its own constraints — print bleed and minimum type on
cards; font support and image blocking in email; safe zones and crops on
social; projector contrast at distance; viewing distance and fabrication for
signage; panels, handles, and regulations on vehicles; embroidery and screen
limits on apparel; safety, serial, certification, and regulatory data on labels.

**Email specifically:** set explicit background colours, or dark-mode clients
will invert the shell and leave near-black text on a near-black field. Use
`color-scheme: light only`. The logo must be an absolute-https PNG — a 360 px
asset displayed at 180 px. SVG does not render in Outlook or Gmail.

Applications should feel related even at different proportions. The consistent
signals are the black-and-cream foundation, restrained amber, bold technical
display type, strong grid alignment, angular movement, disciplined imagery, and
generous negative space.

---

## 10. Governance

### What v0.5.1 changed

The application propagation mechanism became durable and idempotent: each embedded symbol is now identified by `data-pf-symbol` and `data-pf-box`, so every generator run redraws it from `geometria.py`. The patch also synchronizes release markers and removes stale references to font licensing or a replacement logo vector as v1.0 blockers. No visual redesign is introduced.

### What v0.5 changed

The symbol became a geometric master, generated from `geometria.py` and
propagated to all ten logo files and the ten applications that embed it. The
wordmark trace was rebuilt in real curves. Before this, twelve files each held
their own copy of the mark and none of them was the source.

### What v0.4 changed

The tint ramp, font licensing, and the manual. v0.4 introduces no new visual design; snapping
existing tints shifted values by at most six levels out of 255, which is below
the threshold of visible difference. The previous manual PDF was a v0.2 render
that documented neither Amber Deep, nor the contrast table, nor the cream
patterns; it is replaced.

### What is still open

1. **Trademark provenance.** Measurement cannot establish who drew the mark
   first. Registration needs the owner's own artwork and a provenance chain.
2. **Production tests.** No physical application has been proofed — print,
   signage, vehicle, or embroidery.
3. **Brand-owner sign-off.**

One open question about the mark itself: the bolt is not rotationally
symmetric, and nobody has decided whether that is intentional. See
`logo/SOURCE-STATUS.md`.

Font licensing was on this list until v0.4 and is now closed: Anton and Inter
are both SIL OFL 1.1, which covers everything POWERFARM needs.

### Changing this system

Token files are the source of truth; this manual is generated against them and
re-issued whenever they move. A change that affects a rule is a version bump,
a changelog entry, and a manual re-issue — all three, or none. The failure mode
this replaces is a manual that quietly falls two versions behind the files it
claims to describe.
