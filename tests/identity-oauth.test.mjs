import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../apps/identity/", import.meta.url);

test("consent authenticates locally and renders issuer-owned details", async () => {
  const page = await readFile(new URL("app/oauth/consent/page.tsx", root), "utf8");
  assert.match(page, /getClaims\(\)/);
  assert.match(page, /getAuthorizationDetails\(authorizationId\)/);
  assert.match(page, /\/login\?authorization_id=/);
  assert.match(page, /ConsentSurface/);
  assert.match(page, /"authorization_id" in details/);
  assert.doesNotMatch(page, /error\.message|error\?\.message/);
});

test("decision route accepts only authorization id and a typed decision", async () => {
  const route = await readFile(new URL("app/api/oauth/decision/route.ts", root), "utf8");
  const decision = await readFile(new URL("lib/oauth-decision.ts", root), "utf8");
  const source = route + decision;

  assert.match(source, /approveAuthorization/);
  assert.match(source, /denyAuthorization/);
  assert.match(source, /skipBrowserRedirect: true/);
  assert.match(route, /status: 303/);
  assert.doesNotMatch(route, /form\.get\(["'](?:redirect|redirect_uri|redirect_url)["']\)/);
  assert.doesNotMatch(route, /request\.url.*redirect|searchParams.*redirect/);
});
