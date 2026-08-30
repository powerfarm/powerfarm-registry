# Registry runtime Service Bindings

<!-- POWERFARM-MAP:START -->
> **PowerFarm map** · `Registry` · **README**  
> **Navigate:** [Registry](../../README.md) · [Documentation map](../../DOCUMENTATION.md) · [Authority boundary](../../docs/AUTHORITY-EXTRACTION.md)  
> **Boundary:** Registry owns Identity, Office/Occupancy, Brand, Store/Gadgets, Manifest and artifact lineage. Institutional Authority and consequence live in the Super Bundle.
<!-- POWERFARM-MAP:END -->

This private Worker exposes three least-privilege entrypoints:

- `HeartimeRuntimeTokenPort` is fixed to `pf.runtime.heartime`.
- `ProcessWriterRuntimeTokenPort` is fixed to `pf.runtime.process-writer`.
- `RegistryOccupancyPort` projects current Occupancy through `powerfarm.registry.occupancy.v1`.

The token entrypoints validate Registry-local runtime-subject configuration and mint short-lived Supabase-compatible JWTs. The subject cannot be selected by request payload. Bind the appropriate entrypoint physically to the corresponding Super Bundle worker.

The Worker owns no institutional Authority. It must never receive or create grants, RunGrants, Direction, Process consequences, or engine state.

Configure `RUNTIME_TOKEN_CALLERS` for the fixed runtime refs and provide exactly one JWT signing mechanism as a Worker secret. Runtime subject rows must map each PowerFarm runtime ref to a dedicated Supabase `auth.users` principal.

---

Copyright © 2026 PowerFarm. All rights reserved.
