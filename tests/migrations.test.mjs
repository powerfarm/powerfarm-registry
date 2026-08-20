import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);

test("migration source contains authority, one ADK table migration, and its advisor follow-up", async () => {
  const files = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(files.slice(0, 5), [
    "0001_identity.sql",
    "0002_manifest.sql",
    "0003_autoridade.sql",
    "0004_adk_runtime.sql",
    "0005_adk_runtime_advisors.sql",
  ]);
  assert.equal(files.length, 6);
  assert.match(files[5], /^\d{14}_gadget_lineage\.sql$/);
});

test("Gadget lineage migration resolves an exact authorized execution snapshot", async () => {
  const files = (await readdir(migrationsUrl)).filter((name) => name.endsWith("_gadget_lineage.sql"));
  assert.equal(files.length, 1);
  const sql = (await readFile(new URL(files[0], migrationsUrl), "utf8"))
    .replaceAll(/--.*$/gm, "")
    .toLowerCase();

  for (const table of ["workspaces", "workspace_members", "gadgets", "gadget_drafts",
    "gadget_revisions", "gadget_installations", "run_grants"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  assert.match(sql, /unique\s*\(gadget_id, revision\)/);
  assert.match(sql, /unique\s*\(gadget_id, content_hash\)/);
  assert.match(sql, /check \(content_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.match(sql, /create or replace function public\.powerfarm_gadget_apply_patch/);
  assert.match(sql, /revision_conflict/);
  assert.match(sql, /create or replace function public\.powerfarm_gadget_publish/);
  assert.match(sql, /create or replace function public\.powerfarm_resolve_execution/);
  assert.match(sql, /create or replace function public\.powerfarm_issue_run_grant/);
  assert.match(sql, /create or replace function public\.powerfarm_execution_envelope/);
  assert.match(sql, /create or replace function public\.powerfarm_resume_envelope/);
  assert.match(sql, /gadget_revision_hash/);
  assert.match(sql, /gadget_definition_hash/);
  assert.match(sql, /allowed_capabilities/);
  assert.match(sql, /authority_version/);
  assert.match(sql, /idempotency_key/);
  assert.match(sql, /drop policy if exists runs_leitura on public\.runs/);
  assert.match(sql, /created_by = public\.identidade_atual\(\)/);
  assert.match(sql, /revoke insert, update, delete on public\.runs from authenticated/);
  assert.equal((sql.match(/extensions\.digest\(/g) ?? []).length, 2);
  assert.doesNotMatch(sql, /service_role|refresh_token|access_token/);
});

test("ADK advisor follow-up changes no table topology", async () => {
  const sql = (await readFile(new URL("0005_adk_runtime_advisors.sql", migrationsUrl), "utf8"))
    .replaceAll(/--.*$/gm, "")
    .toLowerCase();
  assert.match(sql, /alter function public\.identidade_atual\(\) security invoker/);
  assert.match(sql, /create index adk_sessions_user/);
  assert.doesNotMatch(sql, /create table|alter table|drop table/);
});

test("ADK runtime migration keeps durable state together and behind RLS", async () => {
  const sql = (await readFile(new URL("0004_adk_runtime.sql", migrationsUrl), "utf8"))
    .replaceAll(/--.*$/gm, "")
    .toLowerCase();

  assert.match(sql, /create schema if not exists adk/);
  for (const table of ["sessions", "events", "checkpoints", "effects"]) {
    assert.match(sql, new RegExp(`create table adk\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table adk\\.${table} enable row level security`));
  }

  assert.match(sql, /alter table public\.runs/);
  assert.match(sql, /'waiting_input'/);
  assert.match(sql, /'completed'/);
  assert.match(sql, /create or replace function public\.powerfarm_session_append_event/);
  assert.match(sql, /create or replace function public\.powerfarm_effect_claim/);
  assert.match(sql, /create or replace function public\.powerfarm_run_transition/);
  assert.match(sql, /revoke all on schema adk from public/);
  assert.match(sql, /revoke execute on function public\.powerfarm_session_create[\s\S]*from public/);
  assert.match(sql, /idempotency key is required/);
  assert.match(sql, /invalid run transition/);
  assert.match(sql, /v_inserted/);
  assert.doesNotMatch(sql, /service_role/);
});
