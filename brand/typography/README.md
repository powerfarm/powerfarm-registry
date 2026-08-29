# POWERFARM Typography System

## Primary pairing
- Display: Anton
- Supporting: Inter

Both families are SIL Open Font License 1.1. Licence texts are in `licenses/`.
OFL permits embedding, redistribution inside a bundle, and physical fabrication;
it only forbids selling the fonts alone and reusing a reserved name on a
modified font.

Subset WOFF2 files for manual rendering are in `fonts/`. For production work,
use your normal font-delivery service — these three files are Latin-only.

## Core hierarchy
- Display 2XL: 96 px
- Display XL: 72 px
- Display LG: 56 px
- H1: 40 px
- H2: 32 px
- H3: 24 px
- Body Large: 18 px
- Body: 16 px
- Body Small: 14 px
- Caption: 12 px
- Label: 11 px

## Rules
1. Anton is for impact, not paragraphs.
2. Inter carries functional and technical content.
3. Prefer uppercase for major display lines and labels.
4. Prefer sentence case for body copy.
5. Avoid outlining, stretching, skewing, or faux-condensing type.
6. Do not introduce additional font families without a functional reason.

## v0.3 correction

Anton ships a single weight (400) and no italic. Nothing previously stopped a
browser synthesising fake bold or oblique from a stray `font-weight:700` — the
exact distortion the manual forbids. `font-synthesis: none` is now set globally
and `.pf-display` is pinned to weight 400. Display hierarchy comes from scale
and case, never weight.


## v0.4 — licensing resolved

Font licensing was an open blocker from v0.1 to v0.3. It is closed: Anton and
Inter are both OFL 1.1, which covers every use POWERFARM has, including signage
and embroidery. Nothing needs to be verified before use.
