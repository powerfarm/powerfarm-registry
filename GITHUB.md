# GitHub publication guide

<!-- POWERFARM-MAP:START -->
> **PowerFarm map** · `Registry` · **README**  
> **Navigate:** [Registry](./README.md) · [Documentation map](./DOCUMENTATION.md) · [Authority boundary](./docs/AUTHORITY-EXTRACTION.md)  
> **Boundary:** Registry owns Identity, Office/Occupancy, Brand, Store/Gadgets, Manifest and artifact lineage. Institutional Authority and consequence live in the Super Bundle.
<!-- POWERFARM-MAP:END -->

This directory is a complete Registry repository root.

Recommended initial publication:

```sh
git init -b main
./scripts/git-stage-github.sh
git commit -m "PowerFarm Registry production directory"
git remote add origin <your-repository-url>
git push -u origin main
```

Require the `registry-quality` workflow before merge to `main`. Enable GitHub Security Advisories and secret scanning where available. CI uses only dummy build-time environment values and requires no production secret.

Registry remains paired with the separate PowerFarm Super Bundle. Do not merge institutional Authority or Process consequence into Registry for convenience.

---

Copyright © 2026 PowerFarm. All rights reserved.
