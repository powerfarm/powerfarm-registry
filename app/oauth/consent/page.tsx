/**
 * Superfície de autorização. O emissor é o projeto Supabase.
 * Site URL + Authorization Path: registry.powerfarm.app/oauth/consent.
 *
 * Isto nao e um proxy de redirect. O destino ja esta no cliente OAuth,
 * comparado por correspondencia exacta no emissor. Aprovar ou negar e o
 * protocolo do OAuth Server — approveAuthorization/denyAuthorization — e o
 * redirect de volta vem do emissor, nunca inventado aqui.
 */
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export default async function Consentimento({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const authorizationId = (await searchParams).authorization_id?.trim();
  if (!authorizationId) {
    return (
      <>
        <h1>Autorizar</h1>
        <p className="erro">Pedido invalido: falta authorization_id.</p>
      </>
    );
  }

  const supabase = await supabaseServer();

  // Sem sessao nao ha quem consinta: primeiro entra, depois volta ca.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    const volta = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?redirect=${encodeURIComponent(volta)}`);
  }

  const { data: pedido, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !pedido) {
    return (
      <>
        <h1>Autorizar</h1>
        <p className="erro">
          O emissor recusou o pedido: {error?.message ?? "pedido desconhecido ou expirado"}.
        </p>
      </>
    );
  }

  // Consentimento ja dado antes: o emissor devolve logo o destino.
  if (!("authorization_id" in pedido)) redirect(pedido.redirect_url);

  const cliente = pedido.client?.name?.trim() || "uma aplicação PowerFarm";
  const scopes = (pedido.scope ?? "").split(" ").filter(Boolean);

  return (
    <>
      <h1>Autorizar</h1>
      <p className="sub">
        {cliente} pede para te identificares com a PowerFarm.
        O emissor é o projeto Supabase. Token é autorização — não é a assinatura do cargo.
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        <p className="sub" style={{ marginTop: 0 }}>
          Identidade: tu, neste emissor.
        </p>
        <p className="sub">
          Intenção: emitir um token para {cliente}.
        </p>
        <p className="sub">
          Destino registado no cliente: <span className="mono">{pedido.redirect_uri}</span>
        </p>
        {scopes.length > 0 && (
          <p className="sub">
            Pedido: <span className="mono">{scopes.join(" · ")}</span>
          </p>
        )}

        <form action="/api/oauth/decision" method="POST"
          style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <button type="submit" name="decision" value="approve">Autorizar</button>
          <button type="submit" name="decision" value="deny" className="ghost">Negar</button>
        </form>
      </div>
    </>
  );
}
