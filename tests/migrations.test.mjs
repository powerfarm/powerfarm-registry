import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);

test("migration source contains authority, one ADK table migration, and its advisor follow-up", async () => {
  const files = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(files, [
    "0001_identity.sql",
    "0002_manifest.sql",
    "0003_autoridade.sql",
    "0004_adk_runtime.sql",
    "0005_adk_runtime_advisors.sql",
  ]);
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
