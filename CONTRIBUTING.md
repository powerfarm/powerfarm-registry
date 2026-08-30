# Contributing to PowerFarm Registry

<!-- POWERFARM-MAP:START -->
> **PowerFarm map** · `Registry` · **README**  
> **Navigate:** [Registry](./README.md) · [Documentation map](./DOCUMENTATION.md) · [Authority boundary](./docs/AUTHORITY-EXTRACTION.md)  
> **Boundary:** Registry owns Identity, Office/Occupancy, Brand, Store/Gadgets, Manifest and artifact lineage. Institutional Authority and consequence live in the Super Bundle.
<!-- POWERFARM-MAP:END -->

Read `README.md`, `DOCUMENTATION.md`, and `docs/AUTHORITY-EXTRACTION.md` before editing boundaries.

Registry owns Identity, Office/Occupancy, keys, Brand, Store/Gadgets, Manifest and artifact lineage. It does not own institutional Authority, RunGrants, Process admission or consequence.

Workspace roles are local product ACLs and must not be promoted into PowerFarm institutional Authority.

Before opening a pull request run:

```sh
npm run github:check
npm test
```

CI additionally performs the Next.js application builds after `npm ci`.

---

Copyright © 2026 PowerFarm. All rights reserved.
