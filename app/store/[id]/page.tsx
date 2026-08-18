import { notFound } from "next/navigation";
import { aprovada, lerArtefacto, lerRelacoes, permalink } from "@/lib/manifest";

export const dynamic = "force-dynamic";

const ORDEM_ESTADO = ["approved", "experimental", "draft",
                      "deprecated", "retained", "retired"];

export default async function Artefacto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await lerArtefacto(decodeURIComponent(id));
  if (!a) notFound();

  const v = aprovada(a);
  const { dele, paraEle } = await lerRelacoes(a.id);
  const versoes = [...a.artifact_versions].sort(
    (x, y) => ORDEM_ESTADO.indexOf(x.status) - ORDEM_ESTADO.indexOf(y.status));

  return (
    <>
      <p className="migalha"><a href="/store">Store</a> · {a.kind}</p>
      <h1>{a.title}</h1>
      <p className="mono item-id" style={{ marginBottom: 14 }}>{a.id}</p>
      {a.summary && <p className="sub">{a.summary}</p>}

      {v ? (
        <div className="card evidencia">
          <div className="linha"><span>Fonte</span>
            <b className="mono">{v.source_repo ?? "—"}</b></div>
          <div className="linha"><span>Commit</span>
            <b className="mono">{v.source_commit ?? "—"}</b></div>
          <div className="linha"><span>Caminho</span>
            <b className="mono">{v.source_path ?? "—"}</b></div>
          <div className="linha"><span>Hash do artefacto</span>
            <b className="mono">{v.sha256 ? `sha256:${v.sha256}` : "—"}</b></div>
          <div className="linha"><span>Tipo</span>
            <b className="mono">{v.media_type ?? "—"}{v.size_bytes ? ` · ${v.size_bytes} bytes` : ""}</b></div>
          <div className="linha"><span>Estado</span>
            <b><span className="pill ok">{v.status}</span> versão {v.version}</b></div>
          {permalink(v) && (
            <div className="linha"><span>Permalink</span>
              <b><a className="mono" href={permalink(v)!} target="_blank"
                    rel="noreferrer">abrir no commit exato ↗</a></b></div>
          )}
        </div>
      ) : (
        <p className="vazio">Este artefacto ainda não tem versão aprovada.</p>
      )}

      {v?.notes && (
        <div className="card"><p className="sub" style={{ margin: 0 }}>{v.notes}</p></div>
      )}

      <h2 className="sec">Instalação</h2>
      <div className="card">
        <p className="sub" style={{ margin: 0 }}>
          Ainda não existe CLI. Não há comando de instalação nem de remoção para
          este artefacto, e por isso nenhum é mostrado aqui como se funcionasse.
          O registry já guarda o que um instalador vai precisar de resolver:
          identidade, versão aprovada, fonte, hash e dependências.
        </p>
      </div>

      <h2 className="sec">Dependências</h2>
      {dele.length === 0 && paraEle.length === 0 ? (
        <p className="vazio">Nenhuma relação declarada.</p>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>Relação</th><th>Artefacto</th><th>Versão</th></tr></thead>
            <tbody>
              {dele.map((r: any) => (
                <tr key={`d${r.to_artifact}${r.kind}`}>
                  <td><span className="pill dim">{r.kind}</span></td>
                  <td><a className="mono" href={`/store/${r.to_artifact}`}>{r.to_artifact}</a></td>
                  <td className="mono">{r.to_version ?? "—"}</td>
                </tr>
              ))}
              {paraEle.map((r: any) => (
                <tr key={`p${r.from_artifact}${r.kind}`}>
                  <td><span className="pill dim">← {r.kind}</span></td>
                  <td><a className="mono" href={`/store/${r.from_artifact}`}>{r.from_artifact}</a></td>
                  <td className="mono">{r.from_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="sec">Histórico</h2>
      <div className="card">
        <table>
          <thead><tr><th>Versão</th><th>Estado</th><th>Hash</th><th>Admitida</th></tr></thead>
          <tbody>
            {versoes.map((x) => (
              <tr key={x.version}>
                <td className="mono">{x.version}</td>
                <td><span className={"pill " + (x.status === "approved" ? "ok" : "dim")}>
                  {x.status}</span></td>
                <td className="mono">{x.sha256 ? x.sha256.slice(0, 16) + "…" : "—"}</td>
                <td className="mono">{x.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ marginTop: 28 }}>
        Para agentes: <a className="mono" href={`/api/manifest/${a.id}`}>/api/manifest/{a.id}</a>
      </p>
    </>
  );
}
