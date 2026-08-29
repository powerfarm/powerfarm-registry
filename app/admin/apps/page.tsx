"use client";
import { useEffect, useState } from "react";

type OAuthClient = { client_id: string; client_name: string; client_secret?: string; client_type: string;
  redirect_uris: string[]; registry?: { environment?: string; status?: string } | null };

export default function OAuthAppsPage() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [created, setCreated] = useState<OAuthClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/oauth/clients"); const body = await response.json();
    if (!response.ok) return setError(body.error); setError(null); setClients(body.clients);
  }
  useEffect(() => { void load(); }, []);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setCreated(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/oauth/clients", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)) });
    const body = await response.json(); setBusy(false);
    if (!response.ok && !body.client) return setError(body.error);
    setCreated(body.client);
    if (!body.registry?.linked) setError("Cliente criado no emissor, mas o vínculo local precisa de reparo.");
    event.currentTarget.reset(); void load();
  }
  return <>
    <h1>Apps OAuth</h1><p className="sub">Onboarding canônico: app Powerfarm + cliente OAuth 2.1. Redirects são exatos.</p>
    <div className="card"><form onSubmit={create}>
      <div className="row"><div><label>Nome</label><input name="client_name" required /></div>
        <div><label>Site do app</label><input name="client_uri" type="url" placeholder="https://app.powerfarm.app" /></div></div>
      <div className="row"><div><label>Redirect URIs</label><input name="redirect_uris" required placeholder="https://app.powerfarm.app/auth/callback" /></div></div>
      <div className="row"><div><label>Ambiente</label><select name="environment" defaultValue="production">
        <option value="production">production</option><option value="preview">preview</option><option value="development">development</option></select></div>
        <div><label>Tipo</label><select name="client_type" defaultValue="confidential"><option value="confidential">confidential</option><option value="public">public + PKCE</option></select></div>
        <div><label>Scopes</label><input name="scope" defaultValue="openid email profile offline_access" /></div>
        <div style={{ flex: "0 0 auto" }}><button disabled={busy}>Registar</button></div></div>
    </form>{error && <p className="erro">{error}</p>}</div>
    {created?.client_secret && <div className="card" style={{ borderColor: "var(--registry-warning)" }}>
      <b>Secret visível uma única vez</b><p className="sub">Copie agora. O Registry não o guarda.</p>
      <div className="mono" style={{ wordBreak: "break-all" }}>client_id: {created.client_id}<br />client_secret: {created.client_secret}</div></div>}
    <div className="card"><table><thead><tr><th>App</th><th>Tipo</th><th>Ambiente</th><th>Status</th><th>Redirects</th></tr></thead>
      <tbody>{clients.map((client) => <tr key={client.client_id}><td>{client.client_name}<br /><span className="mono">{client.client_id}</span></td>
        <td>{client.client_type}</td><td>{client.registry?.environment ?? "externo"}</td>
        <td><span className="pill dim">{client.registry?.status ?? "não vinculado"}</span></td>
        <td className="mono">{client.redirect_uris.join(" ")}</td></tr>)}</tbody></table></div>
  </>;
}
