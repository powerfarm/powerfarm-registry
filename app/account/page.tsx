import { redirect } from "next/navigation";
import { currentRegistryPrincipal } from "@/lib/registry-admin";
import { supabaseServer } from "@/lib/supabase-server";

export default async function AccountPage() {
  const principal = await currentRegistryPrincipal();
  if (!principal) redirect("/login?next=/account");
  const supabase = await supabaseServer();
  const { data: memberships } = await supabase.from("workspace_members")
    .select("role, workspaces!inner(slug, title)")
    .eq("identity_id", principal.identityId);
  return <>
    <h1>Minha conta</h1>
    <p className="sub">A sessão do Registry ligada à sua identidade Powerfarm.</p>
    <div className="card"><p><b>{principal.identityName}</b> <span className="pill ok">{principal.identityKind}</span></p>
      <p className="mono">{principal.email ?? "sem email exposto"}</p></div>
    <div className="card"><h2>Store</h2>
      {(memberships ?? []).length === 0 ? <p className="vazio">Nenhum workspace ligado.</p> :
        <table><thead><tr><th>Workspace</th><th>Acesso local</th></tr></thead>
          <tbody>{(memberships ?? []).map((membership: any, index: number) => {
            const workspace = Array.isArray(membership.workspaces) ? membership.workspaces[0] : membership.workspaces;
            return <tr key={`${workspace?.slug ?? "workspace"}:${index}`}><td>{workspace?.title ?? workspace?.slug}</td><td className="mono">{membership.role}</td></tr>;
          })}</tbody></table>}
      <p className="sub">Autoridade institucional, grants e runs pertencem ao PowerFarm Process.</p>
    </div>
  </>;
}
