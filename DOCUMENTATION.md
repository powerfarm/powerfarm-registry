# Documentation map

<!-- POWERFARM-MAP:START -->
> **PowerFarm map** · `Registry` · **MAP**  
> **Navigate:** [Registry](./README.md) · [Documentation map](./DOCUMENTATION.md) · [Authority boundary](./docs/AUTHORITY-EXTRACTION.md)  
> **Boundary:** Registry owns Identity, Office/Occupancy, Brand, Store/Gadgets, Manifest and artifact lineage. Institutional Authority and consequence live in the Super Bundle.
<!-- POWERFARM-MAP:END -->

PowerFarm documentation is a distributed navigation system for humans and language models. A reader should be able to enter this repository at an arbitrary Markdown file, determine where they are, learn the local boundary, and move to the smallest authoritative source needed next.

## Read this repository

| Need | Start here |
| --- | --- |
| Understand what Registry is | [`README.md`](README.md) |
| Understand public/network naming | [`NAMESPACE.md`](NAMESPACE.md) |
| Understand durable database intent | [`PLANO.md`](PLANO.md) |
| Understand why Authority is outside Registry | [`docs/AUTHORITY-EXTRACTION.md`](docs/AUTHORITY-EXTRACTION.md) |
| Understand the visual system | [`brand/MASTER-README.md`](brand/MASTER-README.md) |
| Read the current brand manual | [`brand/POWERFARM-Brand-Manual-v0.5.1.md`](brand/POWERFARM-Brand-Manual-v0.5.1.md) |
| Operate migration custody | [`docs/operations/supabase-migration-custody.md`](docs/operations/supabase-migration-custody.md) |

## Registry boundary

Registry owns durable Identity, Office/Occupancy continuity, identity keys and links, Brand, Store/Gadget surfaces, Manifest and exact artifact lineage. Institutional Authority, admission, execution custody and consequence belong to Process in the separate PowerFarm Super Bundle.

Local Store roles are product ACLs. They are never institutional PowerFarm Authority.

## Document kinds

- **README**: orient locally and link outward.
- **PLAN / DESIGN**: explain intended construction and trade-offs.
- **OPERATIONS**: explain safe operational procedure.
- **HISTORY / CHANGELOG**: preserve lineage; do not treat old state as current truth.
- **BRAND**: define or explain PowerFarm's visual identity and source assets.
- **BOUNDARY**: say what this component owns and what it must not own.

The map block near the top of every PowerFarm-authored Markdown file is navigational metadata, not a replacement for the document itself.

## Third-party material

Third-party licenses, source and documentation retain their upstream notices and are not rewritten merely to match PowerFarm documentation style.

---

Copyright © 2026 PowerFarm. All rights reserved.
