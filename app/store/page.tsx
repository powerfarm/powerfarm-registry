import { PRATELEIRAS, aprovada, lerArtefactos, type Artefacto } from "@/lib/manifest";

export const dynamic = "force-dynamic";

function Cartao({ a }: { a: Artefacto }) {
  const v = aprovada(a);
  return (
    <a href={`/store/${a.id}`} className="item">
      <div className="item-topo">
        <span className="mono item-id">{a.id}</span>
        {v
          ? <span className="pill ok">{v.status} · {v.version}</span>
          : <span className="pill dim">sem versão aprovada</span>}
      </div>
      <b>{a.title}</b>
      {a.summary && <p>{a.summary}</p>}
      {v?.sha256 && <span className="mono hash">sha256:{v.sha256.slice(0, 16)}…</span>}
    </a>
  );
}

export default async function Store({
  searchParams,
}: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const { q = "", kind = "" } = await searchParams;
  const todos = await lerArtefactos();

  const termo = q.trim().toLowerCase();
  const filtrados = todos.filter((a) =>
    (!kind || a.kind === kind) &&
    (!termo || `${a.id} ${a.title} ${a.summary ?? ""}`.toLowerCase().includes(termo)));

  return (
    <>
      <h1>Store</h1>
      <p className="sub">
        Nada aparece aqui por ter sido gerado. Aparece quando a PowerFarm o admite —
        com fonte, versão e hash. As prateleiras vazias são honestas.
      </p>

      <form className="busca" action="/store">
        <input name="q" defaultValue={q} placeholder="Procurar por id, título ou descrição" />
        {kind && <input type="hidden" name="kind" value={kind} />}
        <button type="submit">Procurar</button>
      </form>

      <div className="filtros">
        <a href="/store" className={"pill " + (kind ? "dim" : "warn")}>tudo · {todos.length}</a>
        {PRATELEIRAS.map((p) => {
          const n = todos.filter((a) => a.kind === p.kind).length;
          return (
            <a key={p.kind} href={`/store?kind=${p.kind}`}
               className={"pill " + (kind === p.kind ? "warn" : "dim")}>
              {p.titulo} · {n}
            </a>
          );
        })}
      </div>

      {PRATELEIRAS.filter((p) => !kind || p.kind === kind).map((p) => {
        const desta = filtrados.filter((a) => a.kind === p.kind);
        return (
          <section key={p.kind} className="prateleira">
            <div className="prateleira-cabeca">
              <h2>{p.titulo}</h2>
              <span>{p.nota}</span>
            </div>
            {desta.length === 0 ? (
              <p className="vazio">
                {termo
                  ? "Nada nesta prateleira corresponde à procura."
                  : "Prateleira preparada, ainda sem nada admitido."}
              </p>
            ) : (
              <div className="grelha">{desta.map((a) => <Cartao key={a.id} a={a} />)}</div>
            )}
          </section>
        );
      })}

      <p className="sub" style={{ marginTop: 32 }}>
        Representação para agentes: <a href="/api/manifest" className="mono">/api/manifest</a>
      </p>
    </>
  );
}
