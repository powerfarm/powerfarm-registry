const ENVIRONMENTS = new Set(["development", "preview", "production"]);
const CLIENT_TYPES = new Set(["public", "confidential"]);
const ALLOWED_SCOPES = new Set(["openid", "email", "profile", "phone", "offline_access"]);

function exactUrl(value, { environment, optional = false } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw && optional) return undefined;
  let url;
  try { url = new URL(raw); } catch { throw new Error("redirect URI must be an exact HTTPS URL"); }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const allowedHttp = environment === "development" && loopback;
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && allowedHttp))
    || url.username || url.password || url.hash || raw.includes("*")) {
    throw new Error("redirect URI must be an exact HTTPS URL without wildcards");
  }
  return url.toString();
}

export function normalizeOAuthClientInput(input = {}) {
  const clientName = String(input.client_name ?? "").trim();
  if (clientName.length < 2 || clientName.length > 120) {
    throw new Error("client_name must contain between 2 and 120 characters");
  }
  const environment = String(input.environment ?? "production");
  if (!ENVIRONMENTS.has(environment)) throw new Error("unsupported environment");
  const clientType = String(input.client_type ?? "confidential");
  if (!CLIENT_TYPES.has(clientType)) throw new Error("unsupported client type");
  const rawRedirects = Array.isArray(input.redirect_uris)
    ? input.redirect_uris
    : String(input.redirect_uris ?? "").split(/[\s,]+/);
  const redirectUris = [...new Set(rawRedirects.filter(Boolean).map((uri) => exactUrl(uri, { environment })))];
  if (redirectUris.length < 1 || redirectUris.length > 10) {
    throw new Error("provide between 1 and 10 exact redirect URIs");
  }
  const scopeParts = [...new Set(String(input.scope ?? "openid email profile").trim().split(/\s+/).filter(Boolean))];
  const unsupportedScope = scopeParts.find((scope) => !ALLOWED_SCOPES.has(scope));
  if (unsupportedScope) throw new Error(`unsupported scope: ${unsupportedScope}`);
  if (!scopeParts.includes("openid")) throw new Error("openid scope is required");
  return {
    clientName,
    clientUri: exactUrl(input.client_uri, { environment, optional: true }),
    redirectUris,
    clientType,
    environment,
    scope: scopeParts.join(" "),
    tokenEndpointAuthMethod: clientType === "public" ? "none" : "client_secret_basic",
  };
}
