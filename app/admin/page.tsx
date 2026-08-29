import { redirect } from "next/navigation";
import { requireRegistryGrant } from "@/lib/registry-authority";

export default async function AdminPage() {
  const principal = await requireRegistryGrant("registry.admin");
  if (!principal) redirect("/account?denied=registry.admin");
  return <>
    <h1>Admin</h1>
    <p className="sub">Atos reservados ao mandato administrativo do Registry.</p>
    <div className="card"><h2>Onboarding de apps</h2>
      <p className="sub">Registre a identidade do app e o cliente OAuth correspondente no emissor Powerfarm.</p>
      <a href="/admin/apps">Abrir clientes OAuth →</a></div>
  </>;
}
