import type { SupabaseClient } from "@supabase/supabase-js";

export type OAuthDecision = "approve" | "deny";

export async function decideOAuth(
  supabase: SupabaseClient,
  authorizationId: string,
  decision: OAuthDecision,
) {
  const response = decision === "approve"
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });

  if (response.error || !response.data?.redirect_url) {
    throw new Error("oauth decision failed");
  }
  return response.data.redirect_url;
}
