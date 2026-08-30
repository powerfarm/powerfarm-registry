// Two paths, not one.
//
//   A  fresh database  → every migration in supabase/migrations, in order
//   B  live production → the applied ledger, then only what is still pending
//
// After 20260829012439 was reused for different content, these paths stopped
// being equivalent: a green test on a clean database can sit next to a broken
// production, because a version the ledger already contains is silently
// skipped. Every assertion here exists because of that incident.
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { migrationVersion } from "../scripts/migration-parity.mjs";

const migrations = new URL("../supabase/migrations/", import.meta.url);
const ledger = JSON.parse(await readFile(new URL("applied-ledger.json", migrations), "utf8"));
const files = (await readdir(migrations)).filter((f) => f.endsWith(".sql")).sort();
const sql = new Map();
for (const f of files) sql.set(f, await readFile(new URL(f, migrations), "utf8"));

const appliedVersions = new Set(ledger.entries.map((e) => e.version));
const appliedInMigrations = new Set(
  ledger.entries.filter((e) => (e.location ?? "migrations") === "migrations").map((e) => e.source),
);
const pending = files.filter((f) => !appliedInMigrations.has(f));

// A pending file whose version the ledger already contains will be skipped in
// production. That is only acceptable when the objects it creates are already
// there by another route, and the file must say so.
const SKIPPED_ON_PRODUCTION = new Map([
  ["0003_registry_identity_helpers.sql", "identidade_atual() already exists via 0003_autoridade"],
  ["20260820192536_gadget_store_lineage.sql", "store tables already exist via 20260820192536_gadget_lineage"],
]);

test("no pending migration silently reuses an applied version", () => {
  for (const file of pending) {
    const version = migrationVersion(file);
    if (!appliedVersions.has(version)) continue;
    assert.ok(
      SKIPPED_ON_PRODUCTION.has(file),
      `${file} reuses applied version ${version} and is not declared skippable. ` +
      `Production would skip it while a fresh install runs it. Give it a new forward-only version.`,
    );
    assert.ok(
      sql.get(file).includes("Version note"),
      `${file} is declared skippable on production but carries no "Version note" explaining why`,
    );
  }
});

test("objects the application requires actually run on production", () => {
  // These are new. Nothing in the applied ledger created them, so the migration
  // that does must carry a version greater than everything already applied.
  const required = [
    [/create table if not exists public\.registry_control_memberships/, "registry_control_memberships"],
    [/create or replace function public\.has_registry_control_role/, "has_registry_control_role"],
    [/create or replace function public\.powerfarm_registry_office_snapshot_v1/, "office snapshot RPC"],
    [/create or replace function public\.powerfarm_registry_key_binding_v1/, "key binding RPC"],
  ];
  const highestApplied = [...appliedVersions].sort().at(-1);
  for (const [pattern, label] of required) {
    const owner = files.find((f) => pattern.test(sql.get(f)));
    assert.ok(owner, `no migration creates ${label}`);
    assert.ok(
      migrationVersion(owner) > highestApplied,
      `${label} is created by ${owner}, whose version is not greater than the highest applied ` +
      `version ${highestApplied}. Production would skip it while the application already calls it.`,
    );
  }
});

test("the forward migration does not recreate what production already has", () => {
  const forward = sql.get("20260829130000_registry_control_plane.sql");
  assert.ok(forward, "forward control-plane migration is missing");
  assert.doesNotMatch(
    forward,
    /create table public\.app_oauth_clients/,
    "app_oauth_clients already exists from 20260829012439; recreating it would fail on production",
  );
  assert.match(forward, /drop policy if exists app_oauth_clients_admin_read/);
  assert.match(forward, /on conflict \(identity_id, role\) do nothing/);
});

test("the reused fossil is byte-identical to what was applied", async () => {
  const lock = JSON.parse(await readFile(new URL("migration-lock.json", migrations), "utf8"));
  const fossil = lock.entries.find((e) => e.source === "20260829012439_registry_identity_authority.sql");
  assert.ok(fossil, "the applied 20260829012439 migration is not sealed in the lock");
  assert.equal(fossil.location, "history/process-extracted-2026-08-30",
    "the fossil's text belongs in history: a fresh install must not replay it, because it references public.grants");
  assert.ok(
    !files.some((f) => migrationVersion(f) === "20260829012439"),
    "no active migration may reuse the applied version 20260829012439",
  );
});

test("control-plane roles are carried forward from the rows that exist", () => {
  const forward = sql.get("20260829130000_registry_control_plane.sql");
  assert.match(forward, /from public\.grants g/, "product roles must migrate from the existing grants rows");
  assert.match(forward, /'registry\.admin'/);
  assert.match(forward, /'oauth\.clients\.manage'/);
});
