import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizationRoute,
  buildCallbackUrl,
} from "../apps/identity/lib/auth-flow.mjs";
import { createIdentityAdapter } from "../apps/identity/lib/identity-adapter.mjs";

function fakeClient(overrides = {}) {
  const calls = { otp: [], signInPasskey: 0, registerPasskey: 0, listPasskeys: 0 };
  const auth = {
    async signInWithOtp(input) {
      calls.otp.push(input);
      return { data: {}, error: null };
    },
    async getUser() {
      return {
        data: {
          user: {
            id: "user_1",
            email_confirmed_at: "2026-08-28T12:00:00Z",
            is_anonymous: false,
          },
        },
        error: null,
      };
    },
    async signInWithPasskey() {
      calls.signInPasskey += 1;
      return { data: {}, error: null };
    },
    async registerPasskey() {
      calls.registerPasskey += 1;
      return { data: {}, error: null };
    },
    passkey: {
      async list() {
        calls.listPasskeys += 1;
        return { data: [{ id: "key_1" }], error: null };
      },
    },
    ...overrides,
  };
  return { client: { auth }, calls };
}

test("magic links preserve intent and only carry the opaque authorization id", async () => {
  const { client, calls } = fakeClient();
  const adapter = createIdentityAdapter({
    client,
    callbackUrl: "https://id.example",
    authorizationId: "auth_123",
    passkeyAvailable: true,
  });

  await adapter.requestMagicLink("known@example.com", "sign-in");
  await adapter.requestMagicLink("new@example.com", "sign-up");

  assert.equal(calls.otp[0].options.shouldCreateUser, false);
  assert.equal(calls.otp[1].options.shouldCreateUser, true);
  assert.equal(
    calls.otp[0].options.emailRedirectTo,
    "https://id.example/auth/callback?authorization_id=auth_123",
  );
});

test("unknown email and ordinary provider errors receive the same neutral response", async () => {
  const { client } = fakeClient({
    async signInWithOtp() {
      return { data: null, error: { status: 400, code: "otp_disabled", message: "User not found" } };
    },
  });
  const adapter = createIdentityAdapter({ client, callbackUrl: "https://id.example" });
  assert.deepEqual(
    await adapter.requestMagicLink("unknown@example.com", "sign-in"),
    { ok: true, kind: "link-sent" },
  );
});

test("HTTP 429 is classified without exposing provider text", async () => {
  const { client } = fakeClient({
    async signInWithOtp() {
      return { data: null, error: { status: 429, message: "provider secret detail" } };
    },
  });
  const adapter = createIdentityAdapter({ client, callbackUrl: "https://id.example" });
  assert.deepEqual(
    await adapter.requestMagicLink("person@example.com", "sign-in"),
    {
      ok: false,
      kind: "rate-limited",
      message: "Tente novamente em alguns instantes.",
    },
  );
});

test("full passkey sign-in ceremony maps success", async () => {
  const { client, calls } = fakeClient();
  const adapter = createIdentityAdapter({ client, callbackUrl: "https://id.example", passkeyAvailable: true });
  assert.deepEqual(
    await adapter.signInWithPasskey(),
    { ok: true, kind: "authenticated", hasPasskey: true },
  );
  assert.equal(calls.signInPasskey, 1);
});

test("passkey failures classify cancellation and unavailable configuration", async () => {
  const cancellation = new Error("cancelled");
  cancellation.name = "AbortError";
  const cancelledClient = fakeClient({
    async signInWithPasskey() { throw cancellation; },
  }).client;
  const disabledClient = fakeClient({
    async signInWithPasskey() {
      return { data: null, error: { code: "passkey_disabled", message: "disabled" } };
    },
  }).client;

  assert.equal(
    (await createIdentityAdapter({ client: cancelledClient, callbackUrl: "https://id.example", passkeyAvailable: true }).signInWithPasskey()).kind,
    "cancelled",
  );
  assert.equal(
    (await createIdentityAdapter({ client: disabledClient, callbackUrl: "https://id.example", passkeyAvailable: true }).signInWithPasskey()).kind,
    "unavailable",
  );
});

test("session inspection lists passkeys only for confirmed non-anonymous users", async () => {
  const eligible = fakeClient();
  const adapter = createIdentityAdapter({ client: eligible.client, callbackUrl: "https://id.example" });
  assert.deepEqual(await adapter.inspectSession(), {
    authenticated: true,
    confirmed: true,
    anonymous: false,
    hasPasskey: true,
  });
  assert.equal(eligible.calls.listPasskeys, 1);

  const anonymous = fakeClient({
    async getUser() {
      return { data: { user: { id: "anon", is_anonymous: true } }, error: null };
    },
  });
  assert.deepEqual(
    await createIdentityAdapter({ client: anonymous.client, callbackUrl: "https://id.example" }).inspectSession(),
    { authenticated: true, confirmed: false, anonymous: true, hasPasskey: false },
  );
  assert.equal(anonymous.calls.listPasskeys, 0);
});

test("registration rechecks session eligibility before creating a passkey", async () => {
  const eligible = fakeClient();
  const adapter = createIdentityAdapter({ client: eligible.client, callbackUrl: "https://id.example", passkeyAvailable: true });
  assert.deepEqual(await adapter.registerPasskey(), { ok: true, kind: "passkey-registered", hasPasskey: true });
  assert.equal(eligible.calls.registerPasskey, 1);

  const missing = fakeClient({
    async getUser() { return { data: { user: null }, error: null }; },
  });
  const blocked = await createIdentityAdapter({ client: missing.client, callbackUrl: "https://id.example", passkeyAvailable: true }).registerPasskey();
  assert.equal(blocked.ok, false);
  assert.equal(blocked.kind, "failure");
  assert.equal(missing.calls.registerPasskey, 0);
});

test("callback and authorization routes are reconstructed locally", () => {
  assert.equal(buildCallbackUrl("https://id.example/base", "auth /?"), "https://id.example/auth/callback?authorization_id=auth+%2F%3F");
  assert.equal(buildCallbackUrl("https://id.example", undefined), "https://id.example/auth/callback");
  assert.equal(authorizationRoute("auth /?"), "/oauth/consent?authorization_id=auth+%2F%3F");
  assert.equal(authorizationRoute(undefined), "/");
});
