export function buildCallbackUrl(baseUrl, authorizationId) {
  const callback = new URL("/auth/callback", baseUrl);
  if (authorizationId) callback.searchParams.set("authorization_id", authorizationId);
  return callback.toString();
}

export function authorizationRoute(authorizationId) {
  if (!authorizationId) return "/";
  const query = new URLSearchParams({ authorization_id: authorizationId });
  return `/oauth/consent?${query}`;
}
