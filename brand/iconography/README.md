# POWERFARM Iconography System

## Construction

- 64 × 64 source grid
- 4 px default stroke
- Square line caps
- Bevel joins
- Outline-first construction
- SVGs use `currentColor` for easy recoloring

## Color

Default: POWERFARM Cream `#F8DFC1`

Accent / active: Energy Amber `#FFB02E`

Dark-context export: POWERFARM Black `#080702`

## Rules

1. Keep icons geometric, precise, and technical.
2. Use one color per icon in normal interface and document use.
3. Reserve amber for emphasis, active states, warnings, or highlighted metrics.
4. Avoid shadows, gradients, bevel effects, and decorative fills.
5. Do not distort icons or change their stroke weight independently.
6. Keep enough breathing room around icons. Recommended minimum clear area: 8 px on the 64 px source grid.
7. Do not place these icons inside the POWERFARM logo geometry.
8. At very small sizes, simplify rather than shrinking complex details past legibility.

## Included Icons

- Energy
- Battery
- Plug
- Solar
- Grid
- Sustainability
- Analytics
- Facility
- Maintenance
- Charging
- Monitoring
- Safety

No font files or raster exports are included. The SVG masters remain resolution-independent.

## v0.3 correction

Icon SVGs previously carried `style="color:..."` inline on the root element,
which outranked every CSS class and made all three documented colour states
render cream. They now use the `color` presentation attribute, which any class
rule overrides. Four states ship: default, accent (dark surfaces), accent-light
(`#A96600`, light surfaces), and dark. Colour states require inline SVG.
