import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../apps/identity/", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Identity is an independently buildable workspace consuming canonical UI", async () => {
  const pkg = JSON.parse(await source("package.json"));
  const config = await source("next.config.mjs");
  const layout = await source("app/layout.tsx");
  const rootPkg = JSON.parse(await readFile(new URL("../../package.json", root), "utf8"));
  const rootTsconfig = JSON.parse(await readFile(new URL("../../tsconfig.json", root), "utf8"));

  assert.equal(pkg.name, "@powerfarm/identity-host");
  assert.equal(pkg.dependencies["@powerfarm/identity-ui"], "0.1.0");
  assert.equal(pkg.dependencies["@supabase/supabase-js"], "2.112.4");
  assert.equal(pkg.devDependencies.typescript, "^5.9.3");
  assert.equal(pkg.devDependencies["@types/node"], "^22");
  assert.equal(pkg.devDependencies["@types/react"], "^19");
  assert.match(config, /transpilePackages:\s*\["@powerfarm\/identity-ui"\]/);
  assert.match(layout, /@powerfarm\/identity-ui\/styles\.css/);
  assert.match(rootPkg.scripts["identity:build"], /@powerfarm\/identity-host/);
  assert.ok(rootTsconfig.exclude.includes("apps"));
});

test("login host has one passwordless provider adapter and no production literals", async () => {
  const host = await source("components/IdentityLoginHost.tsx");
  const browser = await source("lib/supabase-browser.ts");
  const files = host + browser + await source("app/login/page.tsx");

  assert.match(host, /IdentitySurface/);
  assert.match(host, /createIdentityAdapter/);
  assert.match(files, /authorization_id/);
  assert.match(host, /setup/);
  assert.match(browser, /experimental:\s*\{ passkey: true \}/);
  assert.doesNotMatch(files, /signInWithPassword|type=["']password|id\.powerfarm\.app/);
});

test("callback exchanges the code then reconstructs only local routes", async () => {
  const callback = await source("app/auth/callback/route.ts");
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /authorizationRoute/);
  assert.match(callback, /result", "expired"/);
  assert.doesNotMatch(callback, /error_description|window\.location|id\.powerfarm\.app/);
});

test("Identity refreshes issuer cookies without adding a second access policy", async () => {
  const middleware = await source("middleware.ts");
  assert.match(middleware, /createServerClient/);
  assert.match(middleware, /getClaims\(\)/);
  assert.match(middleware, /response\.cookies\.set/);
  assert.doesNotMatch(middleware, /redirect\(|service_role|SUPABASE_SECRET/);
});
