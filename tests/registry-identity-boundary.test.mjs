import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("Registry login starts its own PKCE client flow instead of rendering another login", async () => {
  const login = await source("app/login/page.tsx");
  const start = await source("app/auth/start/route.ts");

  assert.match(login, /redirect\(`\/auth\/start\?next=/);
  assert.doesNotMatch(login, /PowerFarmLogin|signInWithOtp|signInWithPassword/);
  assert.match(start, /createOAuthTransaction/);
  assert.match(start, /httpOnly:\s*true/);
  assert.match(start, /sameSite:\s*"lax"/);
  assert.match(start, /secure:\s*true/);
});

test("Registry callback validates state, exchanges the code and establishes its own session", async () => {
  const callback = await source("app/auth/callback/route.ts");

  assert.match(callback, /safeStateEqual/);
  assert.match(callback, /exchangeAuthorizationCode/);
  assert.match(callback, /auth\.setSession/);
  assert.match(callback, /PF_OAUTH_STATE/);
  assert.doesNotMatch(callback, /exchangeCodeForSession/);
});

test("legacy Registry consent forwards only the opaque request to canonical Identity", async () => {
  const consent = await source("app/oauth/consent/page.tsx");
  const decision = await source("app/api/oauth/decision/route.ts");

  assert.match(consent, /NEXT_PUBLIC_IDENTITY_BASE_URL/);
  assert.match(consent, /authorization_id/);
  assert.doesNotMatch(consent, /getAuthorizationDetails|approveAuthorization|denyAuthorization/);
  assert.match(decision, /status:\s*410/);
  assert.doesNotMatch(decision, /approveAuthorization|denyAuthorization/);
});

test("OAuth client administration is gated twice and records only the provider reference", async () => {
  const route = await source("app/api/oauth/clients/route.ts");

  assert.match(route, /requireRegistryControlRole/);
  assert.match(route, /oauth_admin/);
  assert.match(route, /normalizeOAuthClientInput/);
  assert.match(route, /auth\.admin\.oauth\.createClient/);
  assert.match(route, /app_oauth_clients/);
  assert.doesNotMatch(route, /as any/);
});

test("account and admin are separate authenticated projections", async () => {
  const account = await source("app/account/page.tsx");
  const admin = await source("app/admin/page.tsx");

  assert.match(account, /currentRegistryPrincipal/);
  assert.match(admin, /requireRegistryControlRole/);
  assert.match(admin, /admin/);
});
