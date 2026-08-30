import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);

async function allActiveSql() {
  const files = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
  const texts = await Promise.all(files.map(async (file) => [file, (await readFile(new URL(file, migrationsUrl), "utf8")).toLowerCase()]));
  return { files, text: texts.map(([, value]) => value).join("\n") };
}

test("standalone Registry migration stream contains identity, manifest, store, brand and local control plane", async () => {
  const { files } = await allActiveSql();
  assert.deepEqual(files, [
    "0001_identity.sql",
    "0002_manifest.sql",
    "0003_registry_identity_helpers.sql",
    "20260820192536_gadget_store_lineage.sql",
    "20260829012434_admit_brand_v03.sql",
    "20260829012439_registry_control_plane.sql",
    "20260830011500_registry_identity_hardening.sql",
    "20260830070000_registry_production_directory.sql",
  ]);
});

test("institutional Authority and ADK runtime are absent from active Registry migrations", async () => {
  const { text } = await allActiveSql();
  for (const forbidden of [
    /create table public\.grants\b/,
    /create table public\.runs\b/,
    /create table public\.approvals\b/,
    /create table public\.run_grants\b/,
    /create schema if not exists adk/,
    /powerfarm_issue_run_grant/,
    /powerfarm_execution_envelope/,
    /powerfarm_run_create_envelope/,
    /has_registry_grant/,
  ]) assert.doesNotMatch(text, forbidden);
});

test("Store lineage preserves exact immutable Gadget revisions without minting authority", async () => {
  const sql = (await readFile(new URL("20260820192536_gadget_store_lineage.sql", migrationsUrl), "utf8")).toLowerCase();
  for (const table of ["workspaces", "workspace_members", "gadgets", "gadget_drafts", "gadget_revisions", "gadget_installations"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /unique\s*\(gadget_id, revision\)/);
  assert.match(sql, /unique\s*\(gadget_id, content_hash\)/);
  assert.match(sql, /powerfarm_gadget_apply_patch/);
  assert.match(sql, /powerfarm_gadget_publish/);
  assert.match(sql, /powerfarm_resolve_capability/);
  assert.match(sql, /gadget_revision_hash/);
  assert.match(sql, /gadget_definition_hash/);
  assert.doesNotMatch(sql, /run_grants|authority_version|run_create|execution_envelope/);
});

test("Registry administration uses a local control-plane ACL, not institutional grants", async () => {
  const sql = (await readFile(new URL("20260829012439_registry_control_plane.sql", migrationsUrl), "utf8")).toLowerCase();
  assert.match(sql, /create table public\.registry_control_memberships/);
  assert.match(sql, /has_registry_control_role/);
  assert.match(sql, /create table public\.app_oauth_clients/);
  assert.doesNotMatch(sql, /create table public\.grants|authority\.grant|run_grant/);
  assert.doesNotMatch(sql, /client_secret|service_role/);
});


test("Identity writes are control-plane only and active occupancy is singular", async () => {
  const sql = (await readFile(new URL("20260830011500_registry_identity_hardening.sql", migrationsUrl), "utf8")).toLowerCase();
  assert.match(sql, /drop policy if exists identity_links_propria/);
  assert.match(sql, /identity_links_control_insert/);
  assert.match(sql, /has_registry_control_role\('admin'\)/);
  assert.match(sql, /unique index if not exists occupancies_one_active_per_identity/);
  assert.match(sql, /where valid_until is null/);
  assert.doesNotMatch(sql, /with check \(public\.eh_membro\(\)\)/);
});
