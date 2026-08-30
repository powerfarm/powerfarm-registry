const TOKEN_CONTRACT = 'powerfarm.registry.runtime-token.v1';
const SUBJECT_CONTRACT = 'powerfarm.registry.runtime-subject.v1';
const DIRECTORY_CONTRACT = 'powerfarm.registry.directory.v1';
const REF = /^pf(?:\.[a-z0-9][a-z0-9-]*)+$/;
const DEFAULT_TTL_SECONDS = 180;
const MAX_TTL_SECONDS = 900;

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} is required`);
  return value.trim();
}

function assertRef(value, label) {
  const ref = requiredString(value, label);
  if (!REF.test(ref)) throw new TypeError(`${label} must be a canonical PowerFarm ref`);
  return ref;
}

function normalizeBaseUrl(value, { allowInsecure = false } = {}) {
  const raw = requiredString(value, 'SUPABASE_URL').replace(/\/+$/, '');
  const url = new URL(raw);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(allowInsecure && local && url.protocol === 'http:')) {
    throw new Error('SUPABASE_URL must use HTTPS outside explicit local development');
  }
  return url.toString().replace(/\/+$/, '');
}

function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function jsonPart(value) {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}

async function signJwt(signingInput, env) {
  if (env.SUPABASE_JWT_SIGNING_JWK) {
    const jwk = JSON.parse(env.SUPABASE_JWT_SIGNING_JWK);
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || jwk.d == null) {
      throw new Error('SUPABASE_JWT_SIGNING_JWK must be a private P-256 JWK');
    }
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
    );
    const signature = new Uint8Array(await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput),
    ));
    return { alg: 'ES256', signature: b64url(signature) };
  }

  const secret = requiredString(env.SUPABASE_JWT_SECRET, 'SUPABASE_JWT_SECRET');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(signingInput),
  ));
  return { alg: 'HS256', signature: b64url(signature) };
}

async function rpc({ env, fetchImpl, name, body }) {
  const baseUrl = normalizeBaseUrl(env.SUPABASE_URL, { allowInsecure: env.ALLOW_INSECURE_LOCAL === 'true' });
  const apikey = requiredString(env.SUPABASE_PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY');
  const response = await fetchImpl(`${baseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) throw new Error(`Registry RPC ${name} failed (${response.status}): ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  return payload;
}

function allowedCallers(env) {
  const raw = requiredString(env.RUNTIME_TOKEN_CALLERS ?? 'pf.runtime.heartime', 'RUNTIME_TOKEN_CALLERS');
  return new Set(raw.split(',').map((v) => v.trim()).filter(Boolean).map((v) => assertRef(v, 'runtime caller ref')));
}

export async function issueRuntimeToken({ request, env, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  if (!request || request.contract_version !== TOKEN_CONTRACT) {
    throw new Error(`runtime-token contract mismatch: expected ${TOKEN_CONTRACT}`);
  }
  const callerRef = assertRef(request.caller?.identity_ref, 'caller.identity_ref');
  const subjectRef = assertRef(request.subject_ref, 'subject_ref');
  if (!allowedCallers(env).has(callerRef)) throw new Error(`runtime token caller not admitted: ${callerRef}`);
  if (callerRef !== subjectRef && env.ALLOW_RUNTIME_TOKEN_DELEGATION !== 'true') {
    throw new Error('runtime token caller may not mint a different subject');
  }
  const audience = requiredString(request.audience, 'audience');
  const minimumTtl = Number(request.minimum_ttl_seconds ?? 60);
  if (!Number.isInteger(minimumTtl) || minimumTtl < 10 || minimumTtl > MAX_TTL_SECONDS) {
    throw new TypeError('minimum_ttl_seconds must be an integer between 10 and 900');
  }

  const subjectEnvelope = await rpc({
    env, fetchImpl, name: 'powerfarm_registry_runtime_subject_v1',
    body: {
      p_subject_ref: subjectRef,
      p_audience: audience,
      p_minimum_ttl_seconds: minimumTtl,
    },
  });
  if (subjectEnvelope?.contract_version !== SUBJECT_CONTRACT) {
    throw new Error(`runtime-subject contract mismatch: expected ${SUBJECT_CONTRACT}`);
  }
  const subject = subjectEnvelope.data;
  if (subject?.subject_ref !== subjectRef || subject?.audience !== audience) {
    throw new Error('Registry runtime-subject response does not match request');
  }
  const maxTtl = Number(subject.max_ttl_seconds);
  if (!Number.isInteger(maxTtl) || maxTtl < minimumTtl || maxTtl > MAX_TTL_SECONDS) {
    throw new Error('Registry runtime-subject returned invalid max TTL');
  }

  const configuredTtl = Number(env.RUNTIME_TOKEN_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  const ttl = Math.min(Math.max(minimumTtl + 1, configuredTtl), maxTtl);
  const nowSeconds = Math.floor(now() / 1000);
  const expires = nowSeconds + ttl;
  const authAudience = requiredString(env.SUPABASE_AUTH_AUDIENCE ?? 'authenticated', 'SUPABASE_AUTH_AUDIENCE');
  const issuer = requiredString(env.SUPABASE_JWT_ISSUER ?? 'supabase', 'SUPABASE_JWT_ISSUER');
  const claims = {
    iss: issuer,
    aud: authAudience,
    sub: requiredString(subject.supabase_user, 'runtime subject supabase_user'),
    role: 'authenticated',
    iat: nowSeconds,
    exp: expires,
    powerfarm_subject_ref: subjectRef,
    powerfarm_audience: audience,
  };

  const provisionalHeader = { typ: 'JWT', alg: env.SUPABASE_JWT_SIGNING_JWK ? 'ES256' : 'HS256' };
  const signingInput = `${jsonPart(provisionalHeader)}.${jsonPart(claims)}`;
  const signed = await signJwt(signingInput, env);
  if (signed.alg !== provisionalHeader.alg) throw new Error('JWT signer/header algorithm mismatch');
  const token = `${signingInput}.${signed.signature}`;

  return {
    contract_version: TOKEN_CONTRACT,
    data: {
      access_token: token,
      expires_at: new Date(expires * 1000).toISOString(),
      subject_ref: subjectRef,
    },
  };
}

export async function issueFixedRuntimeToken({ request, subjectRef, env, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  const fixed = assertRef(subjectRef, 'fixed runtime subject');
  if (!request || request.subject_ref !== fixed || request.caller?.identity_ref !== fixed) {
    throw new Error(`runtime token Service Binding is fixed to ${fixed}`);
  }
  return issueRuntimeToken({ request, env, fetchImpl, now });
}

export async function resolveCurrentOccupancy({ request, env, fetchImpl = globalThis.fetch }) {
  if (!request || request.contract_version !== 'powerfarm.registry.occupancy.v1') {
    throw new Error('registry occupancy contract mismatch');
  }
  const officeRef = assertRef(request.office_ref ?? request.scope, 'office_ref');
  const observedAt = requiredString(request.at ?? request.observedAt ?? request.observed_at, 'at');
  const envelope = await rpc({
    env, fetchImpl, name: 'powerfarm_registry_office_snapshot_v1',
    body: { p_office_ref: officeRef, p_at: observedAt },
  });
  if (envelope?.contract_version !== DIRECTORY_CONTRACT) throw new Error('Registry directory contract mismatch');
  if (!envelope.data?.exists || envelope.data.occupancy == null) {
    return { contract_version: request.contract_version, data: null };
  }
  const occupancy = envelope.data.occupancy;
  return {
    contract_version: request.contract_version,
    data: {
      ref: assertRef(occupancy.occupancy_ref, 'occupancy_ref'),
      office_ref: officeRef,
      principal_ref: assertRef(occupancy.principal_ref, 'principal_ref'),
      definition_hash: occupancy.definition_hash ?? null,
      valid_from: occupancy.valid_from ?? null,
      valid_until: occupancy.valid_until ?? null,
      observed_at: envelope.data.observed_at ?? observedAt,
    },
  };
}

export const REGISTRY_RUNTIME_CONTRACTS = Object.freeze({
  token: TOKEN_CONTRACT,
  subject: SUBJECT_CONTRACT,
  directory: DIRECTORY_CONTRACT,
});
