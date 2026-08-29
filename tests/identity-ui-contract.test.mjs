import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../packages/identity-ui/", import.meta.url);

test("identity-ui exposes one provider-neutral passwordless surface", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const component = await readFile(new URL("src/IdentitySurface.tsx", root), "utf8");
  const consent = await readFile(new URL("src/ConsentSurface.tsx", root), "utf8");
  const css = await readFile(new URL("src/identity.css", root), "utf8");
  const source = component + consent;

  assert.equal(pkg.name, "@powerfarm/identity-ui");
  assert.equal(pkg.dependencies["@powerfarm/ui-core"], "0.1.0");
  assert.deepEqual(pkg.exports, {
    ".": "./src/index.ts",
    "./styles.css": "./src/identity.css",
    "./machine": "./src/machine.mjs",
    "./types": "./src/identity-types.ts",
  });
  assert.match(css, /@import "@powerfarm\/ui-core\/index\.css";/);
  assert.doesNotMatch(source, /Supabase|signInWithPassword|type=["']password/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}|font-family:\s*["']?(Anton|Inter)/i);
  assert.match(component, /autoComplete="username webauthn"/);
  assert.match(component, /Enviar magic link/);
  assert.match(component, /Entrar com passkey/);
  assert.match(component, /Criar conta/);
});

test("consent surface delegates the authorization decision to its host", async () => {
  const consent = await readFile(new URL("src/ConsentSurface.tsx", root), "utf8");
  assert.match(consent, /authorizationId/);
  assert.match(consent, /action\(\{ authorizationId, decision: "approve" \}\)/);
  assert.match(consent, /action\(\{ authorizationId, decision: "deny" \}\)/);
  assert.doesNotMatch(consent, /window\.location|location\.assign|createClient/);
});
