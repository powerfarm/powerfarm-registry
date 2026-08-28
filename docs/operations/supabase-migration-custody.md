# Supabase migration custody

## Before creating or applying a migration

1. Run `npx supabase@latest migration list --linked` and save the terminal receipt with the task evidence.
2. Compare the remote version and name pairs with `supabase/migrations/applied-ledger.json`.
3. If the remote contains an entry absent from the receipt, locate its exact SQL source before editing any migration.
4. Update `observedAt` and `entries` only after the exact source is committed under `supabase/migrations/`.
5. Run `npm run migrations:check`.
6. Run `npm test && npm run build`.
7. Inspect pending files with `npx supabase@latest db push --linked --dry-run`.
8. A human reviews the dry-run. This procedure does not authorize `db push`.

## Decisions

- `NO CHANGE`: live list, receipt, and sources agree.
- `UPDATE RECEIPT`: live has a migration whose exact source has been recovered and reviewed.
- `STOP — REMOTE SOURCE MISSING`: live has a migration without exact source in Git.
- `STOP — VERSION COLLISION`: two local or remote migrations share a version.

## Forbidden repairs

- Never reset the linked project.
- Never rename or edit an applied migration.
- Never mark an unapplied migration as applied.
- Never use `SUPABASE_SECRET_KEY` to bypass RLS in Registry runtime code.
