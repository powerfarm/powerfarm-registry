import { redirect } from "next/navigation";
import { requireRegistryControlRole } from "@/lib/registry-admin";

export default async function AdminPage() {
  const principal = await requireRegistryControlRole("admin");
  if (!principal) redirect("/account?denied=registry.admin");
  return <>
    <h1>Admin</h1>
    <p className="sub">Administração local do Registry. Isto não concede autoridade institucional PowerFarm.</p>
    <div className="card"><h2>Onboarding de apps</h2>
      <p className="sub">Registre a identidade do app e o cliente OAuth correspondente no emissor Powerfarm.</p>
      <a href="/admin/apps">Abrir clientes OAuth →</a></div>
  </>;
}
