import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { issueFixedRuntimeToken, issueRuntimeToken, resolveCurrentOccupancy } from '../runtime/worker/src/core.mjs';

const migrationUrl = new URL('../supabase/migrations/20260830070000_registry_production_directory.sql', import.meta.url);

function env(overrides = {}) {
  return {
    SUPABASE_URL: 'https://registry.example.test',
    SUPABASE_PUBLISHABLE_KEY: 'publishable',
    SUPABASE_JWT_SECRET: 'test-secret-that-is-not-production',
    RUNTIME_TOKEN_CALLERS: 'pf.runtime.heartime',
    RUNTIME_TOKEN_TTL_SECONDS: '180',
    ...overrides,
  };
}

function responseJson(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function decodePart(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

test('production Registry migration exposes identity refs, occupant refs, key bindings and runtime subjects without Authority', async () => {
  const sql = (await readFile(migrationUrl, 'utf8')).toLowerCase();
  assert.match(sql, /institutional_ref/);
  assert.match(sql, /occupant_ref/);
  assert.match(sql, /key_fingerprint/);
  assert.match(sql, /registry_runtime_subjects/);
  assert.match(sql, /powerfarm_registry_office_snapshot_v1/);
  assert.match(sql, /powerfarm_registry_key_binding_v1/);
  assert.match(sql, /powerfarm_registry_runtime_subject_v1/);
  assert.match(sql, /pf\.runtime\.heartime/);
  assert.match(sql, /pf\.runtime\.process-writer/);
  assert.doesNotMatch(sql, /create table public\.grants|run_grant|authority\.grant|create table public\.runs/);
});

test('Registry runtime issuer mints a short-lived JWT for exactly the configured institutional subject', async () => {
  let observedBody;
  const fetchImpl = async (_url, init) => {
    observedBody = JSON.parse(init.body);
    return responseJson({
      contract_version: 'powerfarm.registry.runtime-subject.v1',
      data: {
        subject_ref: 'pf.runtime.heartime',
        supabase_user: '11111111-1111-1111-1111-111111111111',
        max_ttl_seconds: 300,
        audience: 'powerfarm.supabase.postgrest',
      },
    });
  };
  const envelope = await issueRuntimeToken({
    request: {
      contract_version: 'powerfarm.registry.runtime-token.v1',
      caller: { identity_ref: 'pf.runtime.heartime', component_ref: 'pf.runtime.heartime' },
      subject_ref: 'pf.runtime.heartime',
      audience: 'powerfarm.supabase.postgrest',
      minimum_ttl_seconds: 60,
    },
    env: env(),
    fetchImpl,
    now: () => Date.parse('2026-08-30T06:00:00Z'),
  });
  assert.deepEqual(observedBody, {
    p_subject_ref: 'pf.runtime.heartime',
    p_audience: 'powerfarm.supabase.postgrest',
    p_minimum_ttl_seconds: 60,
  });
  assert.equal(envelope.contract_version, 'powerfarm.registry.runtime-token.v1');
  assert.equal(envelope.data.subject_ref, 'pf.runtime.heartime');
  const [headerPart, payloadPart, signaturePart] = envelope.data.access_token.split('.');
  assert.equal(decodePart(headerPart).alg, 'HS256');
  const payload = decodePart(payloadPart);
  assert.equal(payload.sub, '11111111-1111-1111-1111-111111111111');
  assert.equal(payload.role, 'authenticated');
  assert.equal(payload.powerfarm_subject_ref, 'pf.runtime.heartime');
  assert.equal(payload.powerfarm_audience, 'powerfarm.supabase.postgrest');
  assert.equal(payload.exp - payload.iat, 180);
  assert.ok(signaturePart.length > 20);
});

test('runtime Service Binding subject is physically fixed and cannot be selected by payload', async () => {
  const fetchImpl = async () => responseJson({
    contract_version: 'powerfarm.registry.runtime-subject.v1',
    data: { subject_ref: 'pf.runtime.heartime', supabase_user: '11111111-1111-1111-1111-111111111111', max_ttl_seconds: 300, audience: 'powerfarm.supabase.postgrest' },
  });
  await assert.rejects(() => issueFixedRuntimeToken({
    request: { contract_version: 'powerfarm.registry.runtime-token.v1', caller: { identity_ref: 'pf.runtime.process-writer' }, subject_ref: 'pf.runtime.process-writer', audience: 'powerfarm.supabase.postgrest', minimum_ttl_seconds: 60 },
    subjectRef: 'pf.runtime.heartime', env: env({ RUNTIME_TOKEN_CALLERS: 'pf.runtime.heartime,pf.runtime.process-writer' }), fetchImpl,
  }), /fixed to pf.runtime.heartime/);
});

test('Registry runtime issuer fails closed on caller delegation and TTL/audience errors', async () => {
  const never = async () => { throw new Error('fetch must not run'); };
  await assert.rejects(() => issueRuntimeToken({
    request: {
      contract_version: 'powerfarm.registry.runtime-token.v1',
      caller: { identity_ref: 'pf.runtime.other' },
      subject_ref: 'pf.runtime.heartime', audience: 'powerfarm.supabase.postgrest', minimum_ttl_seconds: 60,
    }, env: env(), fetchImpl: never,
  }), /caller not admitted/);

  const fetchImpl = async () => responseJson({
    contract_version: 'powerfarm.registry.runtime-subject.v1',
    data: { subject_ref: 'pf.runtime.heartime', supabase_user: 'u', max_ttl_seconds: 30, audience: 'powerfarm.supabase.postgrest' },
  });
  await assert.rejects(() => issueRuntimeToken({
    request: {
      contract_version: 'powerfarm.registry.runtime-token.v1',
      caller: { identity_ref: 'pf.runtime.heartime' }, subject_ref: 'pf.runtime.heartime',
      audience: 'powerfarm.supabase.postgrest', minimum_ttl_seconds: 60,
    }, env: env(), fetchImpl,
  }), /invalid max TTL/);
});

test('Registry occupancy Service Binding forwards only the versioned directory query', async () => {
  let call;
  const fetchImpl = async (url, init) => {
    call = { url, body: JSON.parse(init.body) };
    return responseJson({
      contract_version: 'powerfarm.registry.directory.v1',
      data: {
        office_ref: 'pf.office.operations', exists: true, observed_at: '2026-08-30T06:00:00Z',
        occupancy: { occupancy_ref: 'pf.occupancy.abc', principal_ref: 'pf.agent.one', definition_hash: 'a'.repeat(64) },
      },
    });
  };
  const out = await resolveCurrentOccupancy({
    request: { contract_version: 'powerfarm.registry.occupancy.v1', caller: { identity_ref: 'pf.runtime.heartime' }, scope: 'pf.office.operations', observedAt: '2026-08-30T06:00:00Z' },
    env: env(), fetchImpl,
  });
  assert.match(call.url, /powerfarm_registry_office_snapshot_v1$/);
  assert.equal(out.contract_version, 'powerfarm.registry.occupancy.v1');
  assert.equal(out.data.ref, 'pf.occupancy.abc');
  assert.equal(out.data.principal_ref, 'pf.agent.one');
  assert.equal(out.data.office_ref, 'pf.office.operations');
});
