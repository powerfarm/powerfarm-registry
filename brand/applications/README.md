# POWERFARM Applications System

These templates demonstrate how the approved brand ingredients combine in real use.

## Included

1. Business card front/back
2. Email signature visual specification
3. Social campaign pair
4. Presentation cover + content
5. Report cover
6. Website landing hero
7. Facility signage
8. Vehicle side graphic guide
9. Apparel application
10. Equipment / asset label
11. HTML email signature starter

## Logo status

The templates show the geometric symbol master, generated from `logo/geometria.py`. They are not hand-edited: running `python3 logo/gerar.py` redraws the symbol in every template from the same source the logo files use, so a change to the mark reaches the applications automatically. Each symbol group carries `data-pf-symbol` and `data-pf-box`, which is how the generator finds it and knows what optical rectangle it should fill. Do not remove those attributes.

For trademark-critical production the constraint is provenance, not drawing quality: measuring a raster does not prove who drew the mark first. See `logo/SOURCE-STATUS.md`.

## Production thinking

Applications are not just decorative mockups. Every medium has constraints:

- Business cards: print size, bleed, minimum text size
- Email: limited font support and image blocking
- Social: safe zones and platform crops
- Presentation: projector contrast and distance readability
- Reports: print reproduction and editorial hierarchy
- Signage: viewing distance and fabrication
- Vehicles: body panels, doors, handles, windows, visibility, regulations
- Apparel: embroidery/screen-print limits
- Equipment labels: safety, serial, certification, and regulatory data

## Brand behavior

POWERFARM applications should feel related even when they use different proportions or content.

The consistent signals are:
- black / cream foundation
- restrained amber accents
- bold technical display type
- strong grid alignment
- angular movement
- disciplined imagery
- generous negative space
