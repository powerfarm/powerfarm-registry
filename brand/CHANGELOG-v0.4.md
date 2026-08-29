> Historical. This is the v0.4 record, kept as written. Where it has since
> been superseded, `CHANGELOG-v0.5.md` says so.

# POWERFARM Brand System — v0.4

Closing release for the documentation layer. v0.4 introduces no new visual
design. It closes the two items v0.3 carried forward that were closeable, and
restates the one that is not.

---

## 1. ADDED — the tint ramp

**The problem.** A v0.3 palette audit counted 26 distinct hex values in the
package against 7 documented ones. The other 19 were not errors — they were
derived tints doing real work inside layout and application mockups: panel
fills, dividers, muted captions, depth. But because none of them was written
down, every new mockup invented its own near-black and its own warm grey, and
nothing could be checked against anything.

**The fix.** Those values are now a ramp. Powerfarm Cream mixed into Powerfarm
Black in sRGB, in 5% steps, published as `--pf-tint-05` through `--pf-tint-80`
in `color/powerfarm-color-tokens.json` and `color/powerfarm-colors.css`.

Every previously undocumented value was snapped to its nearest step across all
28 affected files. **The package now contains zero undocumented colours** —
re-run the audit and only the 7 palette entries and the ramp stops come back.

The largest shift was 6 levels out of 255 on a single channel, below the
threshold of visible difference. Four neutral greys that had drifted off the
warm ramp entirely (`#242424`, `#151515`) were folded into Graphite.

Each stop ships with its measured contrast on black and on cream, because a
tint ramp without contrast numbers is just a new way to fail WCAG:

- On black: `tint-55` and lighter pass AA as body text. `tint-40` to `tint-50`
  are large-text only. Everything darker is structure and must never carry words.
- On cream the ramp inverts: `tint-40` and darker pass, `tint-50` and lighter fail.

Four stops carry named roles so mockups reach for meaning rather than a number:
`--pf-panel-dark`, `--pf-divider-dark`, `--pf-muted-on-dark`,
`--pf-caption-on-dark`.

---

## 2. RESOLVED — font licensing

Carried as an open blocker since v0.1. It is now answered: **Anton and Inter are
both published under the SIL Open Font License 1.1.**

OFL permits embedding in documents, redistribution inside a bundle, and use in
physical fabrication. Two conditions apply — the fonts may not be sold on their
own, and a modified font may not keep its reserved name. Neither constrains any
normal POWERFARM use, including signage and embroidery.

Both licence texts ship in `typography/licenses/`. The manual no longer tells
readers to verify this before use.

---

## 3. REPLACED — the manual

The package shipped a **v0.2 PDF render** through the whole of v0.3. Its rules
were correct as far as they went, but it documented neither Amber Deep, nor the
contrast table, nor the cream pattern variants — three of v0.3's five headline
changes. Anyone treating the PDF as the sole reference was working from a
system two versions behind the files beside it.

`POWERFARM-Brand-Manual-v0.4.pdf` replaced it, and the v0.2 render was deleted
rather than kept alongside. Nine pages covering mark, colour, typography,
graphic elements, patterns, iconography, layout, imagery, applications, and
governance.

**The manual is now generated, not written by hand.** The markdown source
(then `POWERFARM-Brand-Manual-v0.4.md`) and `build-manual.py` both ship in the
package. Anton and Inter are embedded from the OFL files, so the PDF renders in
the brand's own type rather than a fallback, and needs no network to rebuild.

This is the actual fix for the drift. A manual that is retyped falls behind; a
manual that is rebuilt from the token files cannot fall behind without someone
noticing the build broke.

---

## 4. Version alignment

All nine token files now read `0.4`. *(v0.5 removed the per-module version
headers from the component READMEs entirely — a README reading v0.1 beside
tokens reading 0.5 is a contradiction with no purpose.)*

---

## Still open — carried to v0.5

1. **The logo vector.** The masters in `logo/` are traced from a raster
   reference, and there is no original designer vector to replace them with.
   *(Resolved in v0.5 for the symbol, which was rebuilt from measurement. See
   `CHANGELOG-v0.5.md`.)*

2. **Production tests.** No physical application has been proofed. Print,
   signage, vehicle wrap, and embroidery all have failure modes that only show
   up on the material.

3. **Brand-owner sign-off.**

v1.0 is these three items. Nothing else is outstanding.
