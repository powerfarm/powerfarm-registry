import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOAuthClientInput } from "../lib/oauth-admin.mjs";

test("OAuth onboarding normalizes an exact confidential production client", () => {
  assert.deepEqual(normalizeOAuthClientInput({
    client_name: "Powerfarm Registry",
    client_uri: "https://registry.powerfarm.app",
    redirect_uris: "https://registry.powerfarm.app/auth/callback",
    client_type: "confidential",
    environment: "production",
    scope: "openid email profile offline_access",
  }), {
    clientName: "Powerfarm Registry",
    clientUri: "https://registry.powerfarm.app/",
    redirectUris: ["https://registry.powerfarm.app/auth/callback"],
    clientType: "confidential",
    environment: "production",
    scope: "openid email profile offline_access",
    tokenEndpointAuthMethod: "client_secret_basic",
  });
});

test("OAuth onboarding rejects wildcard, insecure and unsupported inputs", () => {
  assert.throws(() => normalizeOAuthClientInput({
    client_name: "Bad wildcard",
    redirect_uris: "https://*.example.com/callback",
    client_type: "public",
    environment: "production",
  }), /exact HTTPS URL/);
  assert.throws(() => normalizeOAuthClientInput({
    client_name: "Bad HTTP",
    redirect_uris: "http://example.com/callback",
    client_type: "public",
    environment: "production",
  }), /exact HTTPS URL/);
  assert.throws(() => normalizeOAuthClientInput({
    client_name: "Bad scope",
    redirect_uris: "https://example.com/callback",
    client_type: "public",
    environment: "preview",
    scope: "openid admin",
  }), /unsupported scope/);
});

test("public OAuth clients never receive a client authentication method", () => {
  const client = normalizeOAuthClientInput({
    client_name: "Public client",
    redirect_uris: ["https://app.example/callback"],
    client_type: "public",
    environment: "preview",
  });
  assert.equal(client.tokenEndpointAuthMethod, "none");
});
