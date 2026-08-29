# POWERFARM Pattern System

A vector-first family of seamless supporting patterns.

## Included
1. Micro Chevrons
2. Energy Slash Field
3. Technical Grid
4. Data Dot Field
5. Energy Flow Topology
6. Modular Brackets

All source tiles are SVG and can repeat infinitely without pixelation.

## Usage

Patterns are atmospheric brand assets. They should create rhythm, technical character, and energy without competing with the logo or headline.

### Recommended behavior
- Large applications: scale patterns up and reduce contrast.
- UI / small surfaces: use micro chevrons, grids, or dots.
- Motion / process stories: use energy flow topology.
- Section transitions: use slash fields or modular brackets.
- Keep amber accents sparse.
- Never place a dense pattern directly behind the primary logo.

## Technical note
The SVG tiles use the current POWERFARM palette:
- Black #080702
- Cream #F8DFC1
- Amber #FFB02E
- Steel #4D4D4D

No rasterization is required.

## v0.3 addition

All six tiles had an opaque black background, so the manual's instruction to
alternate dark and cream compositions was not achievable. Six cream tiles now
ship in `svg-cream/`, with Energy Amber substituted for Amber Deep `#A96600`
for legibility. Scale modifiers (`.pf-pattern-sm/lg/xl`) and `.pf-pattern-quiet`
implement the "scale up, reduce contrast at large sizes" rule.
