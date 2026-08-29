> Historical. This is the v0.3 record, kept as written.

# POWERFARM Brand System — v0.3

Corrective release. No new visual design; v0.3 makes the v0.2 system behave the
way the manual already describes.

---

## 1. FIXED — icon and logo colour states did not work (critical)

**Symptom.** Every SVG carried `style="color:#F8DFC1"` on its root element.
An inline style attribute outranks any class selector in the CSS cascade, so
`.pf-icon--accent` and `.pf-icon--dark` were silently dead. All three documented
icon colour states rendered cream. The same bug disabled `fill="currentColor"`
on all four `logo/*-master.svg` files.

**Fix.** Inline styles replaced with the `color` **presentation attribute**
(`color="#F8DFC1"`). Presentation attributes sit at the bottom of the cascade:
files still preview correctly when opened standalone, but any CSS rule now
overrides them.

**Verified by render**, not by inspection — see
`_verification/icon-colour-states.png`. Four states across all 12 icons.

Applies to: 12 icons, 4 logo masters, 10 graphic elements.
The 4 fixed-colour logo variants (`-black`, `-cream`) had a stray cream `color`
declaration contradicting their own fill; removed.

---

## 2. FIXED — graphic elements could not be recoloured

All 10 elements were hard-coded `#F8DFC1`, making "amber punctuates the system"
impossible without editing each file. Now `fill="currentColor"` with a cream
presentation-attribute default, driven by `.pf-graphic--accent` etc.

---

## 3. ADDED — Amber Deep `#A96600`

Energy Amber `#FFB02E` scores **1.42:1** on cream — unusable as text.
`#A96600` was already in use across the v0.2 layout and application SVGs but
appeared in no token file, so nobody working from the manual would know it existed.
It is now a documented palette member at **3.56:1** (AA large text).

**Rule.** Energy Amber is a dark-surface accent. On light surfaces substitute
Amber Deep for text, icons, and thin rules. Large solid decorative blocks may
keep Energy Amber, since they carry no legibility requirement.

---

## 4. ADDED — contrast table in the colour tokens

Eight measured pairs now ship in `color/powerfarm-color-tokens.json` and as a
comment block in `powerfarm-colors.css`. Two failures are documented rather than
left to be discovered:

| pair | ratio | status |
|---|---|---|
| cream on black | 15.66 | AA / AAA |
| amber on black | 11.04 | AA / AAA |
| amber on graphite | 9.53 | AA / AAA |
| black on cream | 15.66 | AA / AAA |
| steel on cream | 6.57 | AA |
| amber-deep on cream | 3.56 | AA large only (24px+) |
| **steel on black** | **2.39** | **FAIL — rules only, never text** |
| **energy-amber on cream** | **1.42** | **FAIL — never use** |

Semantic surface pairs (`--pf-on-dark`, `--pf-accent-on-light`, …) added so the
correct pairing is the path of least resistance.

---

## 5. ADDED — cream pattern variants

The manual instructs alternating dark and cream compositions, but all six tiles
had an opaque black background rect, so cream fields were impossible.
Six cream tiles added in `patterns/svg-cream/`, with amber substituted for
Amber Deep. All tile seamlessly — see `_verification/pattern-dark-vs-cream.png`.

Also: 3 of 4 CSS custom properties in the pattern sheet were declared but never
referenced. Sheet rewritten with scale modifiers (`--sm/--lg/--xl`) and
`.pf-pattern-quiet`, implementing the manual's "scale up, reduce contrast for
large environments" rule.

---

## 6. FIXED — typography could produce faux bold

Anton ships one weight (400) and no italic. The manual forbids faux-condensing,
but nothing stopped a browser synthesising fake bold or oblique from a stray
`font-weight:700`. Added `font-synthesis: none` and pinned `.pf-display` to
weight 400. Display hierarchy comes from scale and case, not weight.

---

## 7. FIXED — email signature

- No `background-color` was set. Dark-mode clients inverted the shell and left
  near-black text on a near-black field. Explicit white backgrounds added on
  `body`, `table`, and both cells, plus `color-scheme: light only`.
- Contact lines were plain text; now proper `mailto:` and `https:` links with
  colour pinned so clients don't apply default blue.
- `POWERFARM_LOGO_URL` retained but documented: absolute https PNG, 360px asset
  at 180px display. **SVG will not render in Outlook or Gmail.**

---

## 8. FIXED — version drift

8 of 9 token files still declared `"version": "0.1"`; only `applications`
said 0.2. All now read `0.3`. `imagery/powerfarm-prompt-builder.json` had no
version field at all and now carries one.

---

## Still open — carried to v0.4

1. **Logo source vector.** Masters remain traced from raster. Unchanged blocker
   for v1.0. Do not use for trademark or fabrication work.
2. **The manual PDF in this package is still the v0.2 render.** Its rules are
   correct but it does not yet document Amber Deep, the contrast table, or the
   cream patterns. Re-issue before distributing the manual as the sole reference.
3. **Font licensing** not verified for embedding or fabrication.
4. Palette audit found 26 distinct hex values against 7 documented. The
   remainder are legitimate derived tints inside layout mockups, but a
   documented tint ramp would remove the ambiguity.
