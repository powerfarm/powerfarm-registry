# Authority extraction

<!-- POWERFARM-MAP:START -->
> **PowerFarm map** · `Registry / Docs` · **BOUNDARY**  
> **Navigate:** [Registry](../README.md) · [Documentation map](../DOCUMENTATION.md)  
> **Boundary:** Registry owns Identity, Office/Occupancy, Brand, Store/Gadgets, Manifest and artifact lineage. Institutional Authority and consequence live in the Super Bundle.
<!-- POWERFARM-MAP:END -->

Registry remains the PowerFarm product for **Identity, Office/Occupancy continuity, Brand, Manifest, Store, Gadgets and OAuth identity issuance**.

The following concepts are owned by **Process in the Super Bundle = Continuum + pinned execution Settings (ADK + AI SDK)** and are not part of the active Registry schema:

- institutional grants and revocations;
- RunGrants / effective run authority;
- runs and execution custody;
- approvals/admission/commit consequence;
- ADK sessions/checkpoints/effects used as execution custody.

`workspace_members.role` remains in Registry because it is a local Store/editor ACL. It answers whether a person may edit/install a Gadget in this product. It must never be interpreted as institutional PowerFarm Authority.

## Existing shared Supabase deployments

The old migrations are preserved under `supabase/history/process-extracted-2026-08-30/`. Do **not** drop already-applied tables before Process has imported the required history. The safe transition is:

1. deploy Process/Continuum;
2. import or attest legacy grants/runs/approvals as Process history;
3. switch callers to Process;
4. verify no Registry code reads/writes the legacy authority tables;
5. only then retire the old shared tables with a separately reviewed production migration.

The active `supabase/migrations/` directory describes a fresh standalone Registry, not an in-place destructive migration of the existing database.

---

Copyright © 2026 PowerFarm. All rights reserved.
