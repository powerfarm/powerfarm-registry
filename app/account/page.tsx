import { redirect } from "next/navigation";
import { currentRegistryPrincipal } from "@/lib/registry-authority";
import { supabaseServer } from "@/lib/supabase-server";

export default async function AccountPage() {
  const principal = await currentRegistryPrincipal();
  if (!principal) redirect("/login?next=/account");
  const supabase = await supabaseServer();
  const { data: grants } = await supabase.from("grants")
    .select("action, resource, valid_from, valid_until")
    .eq("identity_id", principal.identityId).is("revoked_at", null).order("action");
  return <>
    <h1>Minha conta</h1>
    <p className="sub">A sessão do Registry ligada à sua identidade Powerfarm.</p>
    <div className="card"><p><b>{principal.identityName}</b> <span className="pill ok">{principal.identityKind}</span></p>
      <p className="mono">{principal.email ?? "sem email exposto"}</p></div>
    <div className="card"><h2>Mandatos ativos</h2>
      {(grants ?? []).length === 0 ? <p className="vazio">Nenhum mandato ativo.</p> :
        <table><thead><tr><th>Ação</th><th>Recurso</th><th>Válido desde</th></tr></thead>
          <tbody>{(grants ?? []).map((grant) => <tr key={`${grant.action}:${grant.resource}`}>
            <td className="mono">{grant.action}</td><td>{grant.resource}</td>
            <td className="mono">{grant.valid_from.slice(0, 10)}</td></tr>)}</tbody></table>}
    </div>
  </>;
}
