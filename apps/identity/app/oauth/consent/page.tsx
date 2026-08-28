import { ConsentSurface } from "@powerfarm/identity-ui";
import { redirect } from "next/navigation";
import { decideOAuth, type OAuthDecision } from "@/lib/oauth-decision";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type ConsentPageProps = {
  searchParams: Promise<{ authorization_id?: string | string[] }>;
};

async function submitDecision(input: { authorizationId: string; decision: OAuthDecision }) {
  "use server";
  if (!input.authorizationId || (input.decision !== "approve" && input.decision !== "deny")) {
    throw new Error("invalid authorization decision");
  }
  const supabase = await getSupabaseServerClient();
  const target = await decideOAuth(supabase, input.authorizationId, input.decision);
  redirect(target);
}

function unavailable(message: string) {
  return (
    <main className="pf-consent-stage">
      <section className="pf-consent-panel">
        <div className="pf-identity-kicker">
          <span className="pf-brand-logo pf-brand-wordmark-horizontal-cream" />
          <span>Authorization</span>
        </div>
        <h1>Não foi possível autorizar.</h1>
        <p className="pf-identity-intro">{message}</p>
      </section>
    </main>
  );
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const rawAuthorizationId = (await searchParams).authorization_id;
  const authorizationId = typeof rawAuthorizationId === "string" ? rawAuthorizationId.trim() : "";
  if (!authorizationId) return unavailable("O pedido está incompleto ou expirou.");

  const supabase = await getSupabaseServerClient();
  const { data: identity } = await supabase.auth.getClaims();
  if (!identity?.claims) {
    redirect(`/login?authorization_id=${encodeURIComponent(authorizationId)}`);
  }

  const { data: details, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) return unavailable("O pedido não está mais disponível.");
  if (!("authorization_id" in details)) redirect(details.redirect_url);

  const scopes = details.scope.split(" ").filter(Boolean).map((name) => ({
    name,
    description: `Permissão solicitada por ${details.client.name}.`,
  }));

  return (
    <ConsentSurface
      client={{ name: details.client.name, logoUrl: details.client.logo_uri }}
      scopes={scopes}
      redirectUri={details.redirect_uri}
      authorizationId={details.authorization_id}
      action={submitDecision}
    />
  );
}
