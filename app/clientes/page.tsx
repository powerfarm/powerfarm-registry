"use client";
import { useEffect, useState } from "react";

type Cliente = {
  client_id: string; client_secret?: string; name: string;
  redirect_uris: string[]; client_type: string; created_at?: string;
};

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState<Cliente | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const r = await fetch("/api/oauth/clients");
    const j = await r.json();
    if (!r.ok) { setErro(j.error); return; }
    setErro(null);
    setLista(j.clients);
  }
  useEffect(() => { carregar(); }, []);

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOcupado(true); setErro(null);
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/oauth/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        redirect_uris: f.get("redirect_uris"),
        client_type: f.get("client_type"),
      }),
    });
    const j = await r.json();
    setOcupado(false);
    if (!r.ok) { setErro(j.error); return; }
    setNovo(j.client);
    e.currentTarget.reset();
    carregar();
  }

  return (
    <>
      <h1>Clientes OAuth</h1>
      <p className="sub">
        Quem pode pedir token ao emissor. Token é autorização — não é a assinatura
        do cargo, que é acto separado sobre conteúdo.
      </p>

      <div className="card">
        <form onSubmit={criar}>
          <div className="row">
            <div><label>Nome</label><input name="name" required /></div>
            <div style={{ maxWidth: 160 }}><label>Tipo</label>
              <select name="client_type" defaultValue="confidential">
                <option value="confidential">confidential</option>
                <option value="public">public</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 3 }}><label>Redirect URIs — exactos, sem wildcard</label>
              <input name="redirect_uris" placeholder="https://exemplo.com/auth/callback" required /></div>
            <div style={{ flex: "0 0 auto" }}>
              <button type="submit" disabled={ocupado}>Registar</button></div>
          </div>
        </form>
        {erro && <p className="erro">{erro}</p>}
      </div>

      {novo?.client_secret && (
        <div className="card" style={{ borderColor: "var(--warn)" }}>
          <b>{novo.name}</b>
          <p className="sub" style={{ margin: "6px 0 12px" }}>
            O secret aparece uma vez só. Copia agora.
          </p>
          <div className="mono" style={{ wordBreak: "break-all" }}>
            client_id: {novo.client_id}<br />
            client_secret: {novo.client_secret}
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="vazio">Nenhum cliente registado.</p>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Client id</th><th>Redirects</th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.client_id}>
                  <td>{c.name}</td>
                  <td><span className="pill dim">{c.client_type}</span></td>
                  <td className="mono">{c.client_id}</td>
                  <td className="mono" style={{ color: "var(--dim)" }}>
                    {(c.redirect_uris ?? []).join(" ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
