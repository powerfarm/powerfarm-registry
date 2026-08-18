import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

type Chave = {
  id: string; identity_id: string; pubkey: string; algorithm: string;
  label: string | null; valid_from: string; valid_until: string | null;
  revoked_at: string | null; revoked_reason: string | null;
  identities: { name: string; kind: string } | null;
};

const DIA = 86400000;

function estado(k: Chave) {
  const agora = Date.now();
  if (k.revoked_at) return { p: "bad", t: "revogada" };
  if (k.valid_until && new Date(k.valid_until).getTime() < agora) return { p: "dim", t: "expirada" };
  if (new Date(k.valid_from).getTime() > agora) return { p: "dim", t: "futura" };
  if (k.valid_until && new Date(k.valid_until).getTime() - agora < 30 * DIA)
    return { p: "warn", t: "expira em breve" };
  return { p: "ok", t: "válida" };
}

async function adicionar(form: FormData) {
  "use server";
  const supabase = await supabaseServer();
  const ate = String(form.get("valid_until") || "").trim();
  await supabase.from("identity_keys").insert({
    identity_id: String(form.get("identity_id")),
    pubkey: String(form.get("pubkey")).trim(),
    algorithm: String(form.get("algorithm") || "ES256"),
    label: String(form.get("label") || "").trim() || null,
    valid_until: ate ? new Date(ate).toISOString() : null,
  });
  revalidatePath("/chaves");
}

async function revogar(form: FormData) {
  "use server";
  const supabase = await supabaseServer();
  await supabase.from("identity_keys")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: String(form.get("motivo") || "").trim() || "revogada pelo registry",
    })
    .eq("id", String(form.get("id")));
  revalidatePath("/chaves");
}

export default async function Chaves() {
  const supabase = await supabaseServer();
  const [{ data: chaves, error }, { data: ids }] = await Promise.all([
    supabase.from("identity_keys")
      .select("*, identities(name, kind)").order("created_at", { ascending: false }),
    supabase.from("identities").select("id, name, kind").order("name"),
  ]);
  const lista = (chaves ?? []) as Chave[];
  const por = (t: string) => lista.filter((k) => estado(k).t === t).length;

  return (
    <>
      <h1>Chaves</h1>
      <p className="sub">
        Que chave é de quem, e até quando. É a pergunta mais quente do sistema:
        responde-se com um SELECT, não resolvendo actos.
      </p>

      <div className="stats">
        <div className="stat"><b>{por("válida")}</b><span>válidas</span></div>
        <div className="stat"><b>{por("expira em breve")}</b><span>expiram em 30 dias</span></div>
        <div className="stat"><b>{por("expirada")}</b><span>expiradas</span></div>
        <div className="stat"><b>{por("revogada")}</b><span>revogadas</span></div>
      </div>

      <div className="card">
        <form action={adicionar}>
          <div className="row">
            <div><label>Identidade</label>
              <select name="identity_id" required>
                {(ids ?? []).map((i: any) => (
                  <option key={i.id} value={i.id}>{i.kind} · {i.name}</option>
                ))}
              </select>
            </div>
            <div style={{ maxWidth: 110 }}><label>Algoritmo</label>
              <input name="algorithm" defaultValue="ES256" /></div>
            <div style={{ maxWidth: 170 }}><label>Válida até</label>
              <input name="valid_until" type="date" /></div>
            <div style={{ maxWidth: 150 }}><label>Etiqueta</label>
              <input name="label" placeholder="opcional" /></div>
          </div>
          <div className="row">
            <div style={{ flex: 3 }}><label>Chave pública</label>
              <textarea name="pubkey" rows={2} required
                placeholder="JWK, PEM ou base64 — o formato é teu" /></div>
            <div style={{ flex: "0 0 auto" }}><button type="submit">Adicionar</button></div>
          </div>
        </form>
        {error && <p className="erro">{error.message}</p>}
      </div>

      {lista.length === 0 ? (
        <p className="vazio">Nenhuma chave registada.</p>
      ) : (
        <div className="card">
          <table>
            <thead><tr>
              <th>Estado</th><th>Identidade</th><th>Chave</th><th>Alg</th>
              <th>Desde</th><th>Até</th><th></th>
            </tr></thead>
            <tbody>
              {lista.map((k) => {
                const e = estado(k);
                return (
                  <tr key={k.id}>
                    <td><span className={"pill " + e.p}>{e.t}</span></td>
                    <td>{k.identities?.name ?? "—"}
                      {k.label && <div style={{ color: "var(--dim)", fontSize: 12 }}>{k.label}</div>}
                    </td>
                    <td className="mono" style={{ maxWidth: 200, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.pubkey}</td>
                    <td className="mono">{k.algorithm}</td>
                    <td className="mono">{k.valid_from.slice(0, 10)}</td>
                    <td className="mono">{k.valid_until ? k.valid_until.slice(0, 10) : "—"}</td>
                    <td>
                      {!k.revoked_at && (
                        <form action={revogar}>
                          <input type="hidden" name="id" value={k.id} />
                          <button className="ghost" type="submit">Revogar</button>
                        </form>
                      )}
                      {k.revoked_at && (
                        <span style={{ color: "var(--dim)", fontSize: 12 }}>
                          {k.revoked_reason}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
