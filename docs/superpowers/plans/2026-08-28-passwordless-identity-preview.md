# Passwordless Identity Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the canonical adapter-driven Powerfarm passwordless Identity UI and a separately buildable Next.js preview host with magic link, sign-up, passkey, callback, and OAuth consent flows.

**Architecture:** `@powerfarm/identity-ui` owns the state machine, React surfaces, copy, and component-scoped layout tokens while consuming `@powerfarm/ui-core`; it never imports Supabase. `apps/identity` owns the Supabase browser/server adapters and OAuth routes. The existing root Registry stays operational and is not redirected until a later live-cutover plan validates the preview and controls rollback.

**Tech Stack:** npm workspaces, React 19, Next.js 15, Node test runner, Supabase JS `2.112.4`, Supabase SSR `0.12.5`, WebAuthn/passkeys, OAuth 2.1 Authorization Code with PKCE.

**Spec:** `docs/superpowers/specs/2026-08-28-integrated-superstructure-passwordless-identity-design.md`

## Global Constraints

- Human login is passwordless: magic link plus passkey only; no password field, password method, reset-password flow, or password copy.
- One email field persists across sign-in, sign-up, errors, and fallback.
- Existing-user magic link sets `shouldCreateUser: false`; sign-up sets it to `true` explicitly.
- Link-request responses are neutral and never reveal whether an account exists.
- Passkey registration is offered only after `getUser()` confirms an authenticated, email-confirmed, non-anonymous user.
- Passkey UI remains optional and magic link remains available on cancellation, unsupported browsers, or API failure.
- Supabase passkey support is experimental and the browser client opts in with `auth.experimental.passkey: true`.
- `authorization_id` may cross login/callback, but no browser-supplied absolute redirect is accepted. Known internal routes are reconstructed by code.
- `identity-ui` imports no Supabase, Vercel, Registry, environment variable, or production URL.
- CSS outside `brand/` contains no brand hex, font family literal, copied logo, icon, font, or source JSON.
- The UI has one visual direction. Its signature is the canonical geometric symbol at architectural scale, crossed by one amber credential seam; there are no alternative themes or mock state laboratory.
- This plan does not enable passkeys in the live Supabase project, attach `id.powerfarm.app`, modify DNS, register OAuth clients, or redirect the live Registry.

## Current Official Contracts

- Supabase passkeys require `@supabase/supabase-js >= 2.105.0`, explicit client opt-in, and an existing confirmed non-anonymous user for registration: <https://supabase.com/docs/guides/auth/passkeys>.
- `signInWithPasskey()` and `registerPasskey()` run the full WebAuthn ceremony; `auth.passkey.list()` returns the current user's registered credentials.
- Magic link uses `signInWithOtp`; `shouldCreateUser: false` prevents implicit registration: <https://supabase.com/docs/guides/auth/auth-email-passwordless>.
- OAuth authorization UI receives `authorization_id`; the host calls `getAuthorizationDetails`, `approveAuthorization`, or `denyAuthorization`: <https://supabase.com/docs/guides/auth/oauth-server/getting-started>.

---

## Planned File Structure

```text
packages/identity-ui/
├── package.json
└── src/
    ├── machine.mjs
    ├── identity-types.ts
    ├── IdentitySurface.tsx
    ├── ConsentSurface.tsx
    ├── index.ts
    └── identity.css

apps/identity/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── next-env.d.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── auth/callback/route.ts
│   ├── oauth/consent/page.tsx
│   └── api/oauth/decision/route.ts
├── components/IdentityLoginHost.tsx
└── lib/
    ├── auth-flow.mjs
    ├── identity-adapter.mjs
    ├── supabase-browser.ts
    └── supabase-server.ts

tests/
├── identity-machine.test.mjs
├── identity-adapter.test.mjs
└── identity-host.test.mjs
```

---

### Task 1: Implement the passwordless state machine

**Files:**
- Create: `packages/identity-ui/package.json`
- Create: `packages/identity-ui/src/machine.mjs`
- Create: `packages/identity-ui/src/identity-types.ts`
- Test: `tests/identity-machine.test.mjs`

**Interfaces:**
- Produces: `createIdentityState(options)` and `reduceIdentityState(state, event)`.
- Produces: `IdentityAdapter`, `IdentityActionResult`, `IdentityContext`, and `IdentityComplete` TypeScript contracts.
- Consumes: no host or network dependency.

- [ ] **Step 1: Write the failing state-machine tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createIdentityState, reduceIdentityState } from "../packages/identity-ui/src/machine.mjs";

test("email survives sign-up and fallback transitions", () => {
  let state = createIdentityState({ passkeyAvailable: true });
  state = reduceIdentityState(state, { type: "email.changed", email: "dan@example.com" });
  state = reduceIdentityState(state, { type: "signup.chosen" });
  state = reduceIdentityState(state, { type: "passkey.cancelled" });
  assert.equal(state.email, "dan@example.com");
  assert.equal(state.screen, "recover-with-email");
});

test("confirmed authentication offers first passkey only when needed", () => {
  const state = reduceIdentityState(
    createIdentityState({ passkeyAvailable: true, setupPasskey: true }),
    { type: "session.confirmed", hasPasskey: false },
  );
  assert.equal(state.screen, "offer-passkey");
});

test("existing passkey completes without enrollment offer", () => {
  const state = reduceIdentityState(
    createIdentityState({ passkeyAvailable: true }),
    { type: "passkey.authenticated" },
  );
  assert.equal(state.screen, "complete");
});
```

Add literal cases for neutral link completion, rate limit, unsupported passkey, registration success, skip enrollment, and invalid event rejection.

- [ ] **Step 2: Run the state-machine tests and verify RED**

Run: `node --test tests/identity-machine.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `machine.mjs`.

- [ ] **Step 3: Implement the state machine**

Create the initial package manifest and workspace link:

```json
{
  "name": "@powerfarm/identity-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": { "@powerfarm/ui-core": "0.1.0" },
  "peerDependencies": { "react": "^19.0.0" },
  "exports": {
    "./machine": "./src/machine.mjs",
    "./types": "./src/identity-types.ts"
  }
}
```

Run `npm install` after writing the manifest so `package-lock.json` records the workspace.

Use this public state shape:

```js
{
  screen: "idle" | "sending-link" | "link-sent" | "sending-confirmation" |
    "confirmation-sent" | "authenticating-passkey" | "checking-session" |
    "offer-passkey" | "registering-passkey" | "recover-with-email" |
    "failure" | "complete",
  intent: "sign-in" | "sign-up",
  email: string,
  passkeyAvailable: boolean,
  setupPasskey: boolean,
  notice: string | null,
  error: string | null,
}
```

`reduceIdentityState` is a total reducer for declared events and throws `invalid identity event: <type>` for unknown events. It never clears `email` except on an explicit `email.changed` event.

Define the host contract in `identity-types.ts`:

```ts
export type IdentityFailureKind =
  | "cancelled" | "unavailable" | "rate-limited" | "expired" | "failure";

export type IdentityActionResult =
  | { ok: true; kind: "link-sent" | "authenticated" | "passkey-registered"; hasPasskey?: boolean }
  | { ok: false; kind: IdentityFailureKind; message: string; retryAfterSeconds?: number };

export type IdentityAdapter = {
  passkeyAvailable: boolean;
  requestMagicLink(email: string, intent: "sign-in" | "sign-up"): Promise<IdentityActionResult>;
  inspectSession(): Promise<{ authenticated: boolean; confirmed: boolean; anonymous: boolean; hasPasskey: boolean }>;
  signInWithPasskey(): Promise<IdentityActionResult>;
  registerPasskey(): Promise<IdentityActionResult>;
};

export type IdentityContext = { requestingApp?: string; authorizationId?: string };
export type IdentityComplete = { method: "magic-link" | "passkey"; passkeyRegistered: boolean };
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/identity-machine.test.mjs`

Expected: all state cases PASS.

- [ ] **Step 5: Commit the machine**

```bash
git add packages/identity-ui/package.json packages/identity-ui/src/machine.mjs packages/identity-ui/src/identity-types.ts tests/identity-machine.test.mjs package-lock.json
git commit -m "feat: define passwordless identity state machine"
```

---

### Task 2: Build the canonical Identity and consent surfaces

**Files:**
- Create: `packages/identity-ui/src/IdentitySurface.tsx`
- Create: `packages/identity-ui/src/ConsentSurface.tsx`
- Create: `packages/identity-ui/src/index.ts`
- Create: `packages/identity-ui/src/identity.css`
- Modify: `packages/identity-ui/package.json`
- Test: `tests/identity-ui-contract.test.mjs`

**Interfaces:**
- Consumes: `IdentityAdapter`, `IdentityContext`, `IdentityComplete`, `createIdentityState`, and `reduceIdentityState`.
- Produces: `<IdentitySurface adapter context setupPasskey onComplete />` and `<ConsentSurface client scopes redirectUri action />`.

- [ ] **Step 1: Write the failing package-boundary test**

The test loads the package manifest and all source files, then asserts:

```js
assert.equal(pkg.name, "@powerfarm/identity-ui");
assert.equal(pkg.dependencies["@powerfarm/ui-core"], "0.1.0");
assert.match(css, /@import "@powerfarm\/ui-core\/index\.css";/);
assert.doesNotMatch(source, /Supabase|signInWithPassword|type=["']password/);
assert.doesNotMatch(css, /#[0-9a-f]{3,8}|font-family:\s*["']?(Anton|Inter)/i);
assert.match(component, /autoComplete="username webauthn"/);
assert.match(component, /Enviar magic link/);
assert.match(component, /Entrar com passkey/);
assert.match(component, /Criar conta/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/identity-ui-contract.test.mjs`

Expected: FAIL because `IdentitySurface.tsx` does not exist.

- [ ] **Step 3: Implement the React surfaces**

`IdentitySurface` uses `useReducer(reduceIdentityState, ...)`, one email input, and these actions:

- primary: `Enviar magic link` or `Criar conta` according to intent;
- secondary: `Entrar com passkey` only when `adapter.passkeyAvailable`;
- text action: `Novo por aqui? Criar conta` / `Já tem acesso? Entrar`;
- enrollment: `Criar passkey agora` and `Agora não`;
- fallback: keeps email visible and returns focus to it.

The component maps adapter results to machine events and calls `onComplete` only after authenticated passkey or completed callback/session inspection. It never renders raw provider error text for link requests.

`ConsentSurface` accepts only display data and posts `authorization_id` to a host-provided `action`; it has no SDK import and no redirect logic.

Update the package exports exactly:

```json
"exports": {
  ".": "./src/index.ts",
  "./styles.css": "./src/identity.css",
  "./machine": "./src/machine.mjs",
  "./types": "./src/identity-types.ts"
}
```

- [ ] **Step 4: Implement the single visual direction**

`identity.css` starts with the canonical import and declares component-only geometry once:

```css
@import "@powerfarm/ui-core/index.css";

:root {
  --pf-identity-stage-max: 84rem;
  --pf-identity-panel-max: 30rem;
  --pf-identity-copy-max: 13ch;
  --pf-identity-seam: var(--pf-control-border-width);
}
```

Desktop is a two-zone stage: a large canonical symbol field and one compact credential panel. The symbol is rendered with a generated `pf-brand-symbol-master` asset class. One amber line crosses the symbol field and terminates at the active control. There are no gradients, illustrations, rounded cards, floating glass, alternate themes, or state selector.

Mobile collapses to one column, keeps the symbol as a cropped background field, and makes every action full width. `:focus-visible`, `aria-live`, disabled states, and `prefers-reduced-motion` all use UI Core contracts.

- [ ] **Step 5: Extend generated brand asset classes**

Add `.pf-brand-symbol-master`, `.pf-brand-symbol-cream`, and `.pf-brand-symbol-black` to `compileLogoClasses()` in `scripts/brand-model.mjs`, write a failing assertion in `tests/brand-build.test.mjs`, update the intentional lock with `npm run brand:lock`, then rerun `npm run brand:build`.

- [ ] **Step 6: Verify and commit**

Run: `node --test tests/identity-ui-contract.test.mjs tests/identity-machine.test.mjs tests/brand-build.test.mjs`

Run: `npm run brand:check`

Expected: tests and guard PASS.

```bash
git add packages/identity-ui scripts/brand-model.mjs brand/brand-lock.json tests/identity-ui-contract.test.mjs tests/brand-build.test.mjs
git commit -m "feat: add canonical Powerfarm Identity surface"
```

---

### Task 3: Pin current Supabase clients and implement the host adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `apps/identity/lib/auth-flow.mjs`
- Create: `apps/identity/lib/identity-adapter.mjs`
- Create: `apps/identity/lib/supabase-browser.ts`
- Test: `tests/identity-adapter.test.mjs`

**Interfaces:**
- Produces: `createIdentityAdapter({ client, callbackUrl, authorizationId, passkeyAvailable })`.
- Produces: `buildCallbackUrl(baseUrl, authorizationId)` and `authorizationRoute(authorizationId)`.
- Consumes: the official Supabase JS passkey and OTP methods.

- [ ] **Step 1: Write failing adapter tests with a narrow external double**

Use a fake `client.auth` that records arguments but leaves all adapter logic real. Assert:

```js
assert.equal(signInCall.options.shouldCreateUser, false);
assert.equal(signUpCall.options.shouldCreateUser, true);
assert.equal(signInCall.options.emailRedirectTo, "https://id.example/auth/callback?authorization_id=auth_123");
assert.deepEqual(await adapter.signInWithPasskey(), { ok: true, kind: "authenticated", hasPasskey: true });
assert.equal(registerPasskeyCalls, 1);
```

Add cases for unknown email neutralization, HTTP 429, `AbortError`, `passkey_disabled`, missing confirmed session, and safe route reconstruction.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/identity-adapter.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Pin the current compatible packages**

Run:

```bash
npm install --save-exact @supabase/supabase-js@2.112.4 @supabase/ssr@0.12.5
```

Node 22 is the minimum supported runtime for this version and already matches CI.

- [ ] **Step 4: Implement flow helpers and adapter**

`buildCallbackUrl` uses `new URL("/auth/callback", baseUrl)` and may add only the opaque `authorization_id`. `authorizationRoute` returns `/oauth/consent?authorization_id=<encoded>` or `/`.

The adapter behavior is fixed:

- `requestMagicLink`: calls `signInWithOtp`; maps non-rate-limit results to the same `{ ok: true, kind: "link-sent" }` response;
- `inspectSession`: calls `getUser`, rejects anonymous/unconfirmed enrollment, and calls `auth.passkey.list()` only for an eligible user;
- `signInWithPasskey`: calls the full `auth.signInWithPasskey()` ceremony;
- `registerPasskey`: rechecks eligibility, then calls `auth.registerPasskey()`;
- WebAuthn cancellation becomes `cancelled`; disabled/unsupported becomes `unavailable`; expired challenge becomes `expired`; no credential or account detail is exposed.

`supabase-browser.ts` creates one browser client with:

```ts
createBrowserClient(url, publishableKey, {
  auth: { experimental: { passkey: true } },
});
```

- [ ] **Step 5: Run adapter and existing Registry build tests**

Run: `node --test tests/identity-adapter.test.mjs`

Run with CI build variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ci.invalid.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-key \
NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
npm run build
```

Expected: adapter tests PASS and the package upgrade does not break the root Registry.

- [ ] **Step 6: Commit the adapter**

```bash
git add package.json package-lock.json apps/identity/lib tests/identity-adapter.test.mjs
git commit -m "feat: adapt Supabase passwordless authentication"
```

---

### Task 4: Create the separately buildable Identity host

**Files:**
- Create: `apps/identity/package.json`
- Create: `apps/identity/next.config.mjs`
- Create: `apps/identity/tsconfig.json`
- Create: `apps/identity/next-env.d.ts`
- Create: `apps/identity/app/layout.tsx`
- Create: `apps/identity/app/page.tsx`
- Create: `apps/identity/app/login/page.tsx`
- Create: `apps/identity/components/IdentityLoginHost.tsx`
- Create: `apps/identity/app/auth/callback/route.ts`
- Create: `apps/identity/lib/supabase-server.ts`
- Modify: `package.json`
- Test: `tests/identity-host.test.mjs`

**Interfaces:**
- Consumes: `@powerfarm/identity-ui`, `createIdentityAdapter`, and SSR cookie clients.
- Produces: `/login` and `/auth/callback` for a deployable `id.powerfarm.app` candidate.

- [ ] **Step 1: Write the failing host boundary test**

Assert the workspace manifest, package imports, absence of password, explicit experimental passkey configuration, no production URL literals, and callback use of `authorizationRoute`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/identity-host.test.mjs`

Expected: FAIL because `apps/identity/package.json` does not exist.

- [ ] **Step 3: Create the Next workspace**

`apps/identity/package.json` is private and pins workspace packages:

```json
{
  "name": "@powerfarm/identity-host",
  "version": "0.1.0",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "@powerfarm/brand": "0.5.1",
    "@powerfarm/identity-ui": "0.1.0",
    "@powerfarm/ui-core": "0.1.0",
    "@supabase/ssr": "0.12.5",
    "@supabase/supabase-js": "2.112.4",
    "next": "^15.5.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

`next.config.mjs` transpiles `@powerfarm/identity-ui`; `layout.tsx` imports `@powerfarm/identity-ui/styles.css`. `/` redirects to `/login`.

Add root scripts:

```json
"identity:dev": "npm run brand:build && npm run dev --workspace @powerfarm/identity-host",
"identity:build": "npm run brand:build && npm run build --workspace @powerfarm/identity-host"
```

- [ ] **Step 4: Implement login and callback**

`IdentityLoginHost` derives feature availability from browser WebAuthn objects, creates the adapter once, reads only `authorization_id`, `setup=passkey`, and normalized result codes, and reconstructs the completion target with `authorizationRoute`.

The callback route exchanges `code` for a cookie session. Success redirects to `/login?setup=passkey` plus the opaque `authorization_id`; failure redirects to `/login?result=expired` with no provider message.

- [ ] **Step 5: Verify host tests and build**

Run: `npm install`

Run: `node --test tests/identity-host.test.mjs`

Run with build-only public values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ci.invalid.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-key \
NEXT_PUBLIC_IDENTITY_BASE_URL=http://localhost:3001 \
npm run identity:build
```

Expected: tests PASS and the Identity host builds independently.

- [ ] **Step 6: Commit the host**

```bash
git add apps/identity package.json package-lock.json tests/identity-host.test.mjs
git commit -m "feat: add Powerfarm Identity preview host"
```

---

### Task 5: Move OAuth consent into the Identity host and run preview gates

**Files:**
- Create: `apps/identity/app/oauth/consent/page.tsx`
- Create: `apps/identity/app/api/oauth/decision/route.ts`
- Create: `tests/identity-oauth.test.mjs`
- Modify: `.env.example`
- Modify: `.github/workflows/quality.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: Supabase OAuth methods and `<ConsentSurface>`.
- Produces: an Identity host that can authenticate, resume `authorization_id`, display exact client/scopes, and approve or deny through the issuer.

- [ ] **Step 1: Write failing OAuth boundary tests**

Assert that unauthenticated users are sent to `/login?authorization_id=...`, the page calls `getAuthorizationDetails`, the decision route calls only `approveAuthorization`/`denyAuthorization`, and browser-provided redirect URLs are absent.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/identity-oauth.test.mjs`

Expected: FAIL because Identity consent routes do not exist.

- [ ] **Step 3: Implement consent and decision routes**

The consent page uses `getClaims()` for authentication, reconstructs the known login URL, narrows `OAuthAuthorizationDetails | OAuthRedirect`, and sends trusted issuer details to `ConsentSurface`. The POST route validates `authorization_id` and `decision`, calls the matching issuer method, and returns `303` to `data.redirect_url`.

- [ ] **Step 4: Document preview configuration without mutating it**

Add exact variables to `.env.example` and README:

```text
NEXT_PUBLIC_IDENTITY_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Document that live passkey testing requires one stable RP ID and origins matching that domain; a random `vercel.app` preview cannot share the future `id.powerfarm.app` RP ID.

CI runs `npm run identity:build` with build-only values after the root Registry build.

- [ ] **Step 5: Run the complete phase gate**

```bash
npm ci
npm test
NEXT_PUBLIC_SUPABASE_URL=https://ci.invalid.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-key \
NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
npm run build
NEXT_PUBLIC_SUPABASE_URL=https://ci.invalid.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-key \
NEXT_PUBLIC_IDENTITY_BASE_URL=http://localhost:3001 \
npm run identity:build
git status --short
```

Required result: both apps compile, all tests and guards pass, no generated brand files are tracked, and no live setting changes.

- [ ] **Step 6: Commit preview readiness**

```bash
git add apps/identity .env.example .github/workflows/quality.yml README.md tests/identity-oauth.test.mjs
git commit -m "feat: complete Identity OAuth preview flow"
```

---

## Completion Boundary

At the end of this plan the repository contains a buildable Identity host and real Supabase adapter, but production remains unchanged. The next plan owns the external preview deployment, stable preview domain/RP decision, actual magic-link and WebAuthn smoke tests, Supabase passkey/OAuth configuration, Registry OAuth client registration, `id.powerfarm.app` cutover, and rollback.
