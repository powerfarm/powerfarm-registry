/**
 * Superfície de autorização. O emissor é o projeto Supabase.
 * Site URL + Authorization Path: registry.powerfarm.app/oauth/consent.
 *
 * Isto nao e um proxy de redirect. O destino ja esta no cliente OAuth,
 * comparado por correspondencia exacta no emissor.
 */
export default function Consentimento({
  searchParams,
}: {
  searchParams: Promise<{ client_name?: string; redirect_uri?: string }>;
}) {
  return <Corpo searchParams={searchParams} />;
}

async function Corpo({
  searchParams,
}: {
  searchParams: Promise<{ client_name?: string; redirect_uri?: string }>;
}) {
  const q = await searchParams;
  const cliente = q.client_name?.trim() || "uma aplicação PowerFarm";
  const destino = q.redirect_uri?.trim() || null;

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
          Destino registado no cliente
          {destino
            ? <>: <span className="mono">{destino}</span></>
            : " — o emissor já o tem; não se aceita um destino passado à mão."}
        </p>
        <p className="sub" style={{ marginBottom: 0 }}>
          Esta página apresenta o pedido. Aprovar ou negar é o protocolo do
          OAuth Server, não um redirect inventado aqui.
        </p>
      </div>
    </>
  );
}
