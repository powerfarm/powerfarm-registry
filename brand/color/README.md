# POWERFARM Colour

Seven documented colours. Two are conditional on surface:

- **Energy Amber `#FFB02E`** — dark surfaces only. Scores 1.42:1 on cream.
- **Amber Deep `#A96600`** — amber text, icons, and thin rules on light
  surfaces. 3.56:1, AA for large text (24px+).
- **Steel `#4D4D4D`** — rules and dividers on dark (2.39:1, fails as text);
  usable as body text on cream (6.57:1).

A measured eight-pair contrast table ships in
`powerfarm-color-tokens.json` and as a comment block in `powerfarm-colors.css`.
Use the semantic pairs (`--pf-on-dark`, `--pf-accent-on-light`) rather than raw
hex so the correct pairing is the default path.

## v0.4 — the tint ramp

Seven documented colours were never the whole story: a v0.3 audit found 26
distinct hex values in the package. The other 19 were derived tints inside
mockups — panels, dividers, muted captions — doing real work with no name.

They are now `--pf-tint-05` to `--pf-tint-80`: cream mixed into black in sRGB,
5% steps. Every stray value has been snapped to its nearest step, so the
package contains no undocumented colour. Each stop ships with measured contrast
on both black and cream.

Tints are surface and structure. A tint never substitutes for the accent, and
on black nothing below `tint-55` may carry body text.
