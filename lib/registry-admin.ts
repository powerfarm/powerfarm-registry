import { supabaseServer } from "@/lib/supabase-server";

export type RegistryPrincipal = {
  userId: string;
  email: string | null;
  identityId: string;
  identityName: string;
  identityKind: string;
};

export async function currentRegistryPrincipal(): Promise<RegistryPrincipal | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: link } = await supabase
    .from("identity_links")
    .select("identity_id, identities!inner(id, name, kind)")
    .eq("supabase_user", user.id)
    .is("unlinked_at", null)
    .maybeSingle();
  const identity = Array.isArray(link?.identities) ? link.identities[0] : link?.identities;
  if (!link || !identity) return null;
  return {
    userId: user.id,
    email: user.email ?? null,
    identityId: link.identity_id,
    identityName: identity.name,
    identityKind: identity.kind,
  };
}

/** Registry-local product administration. This is not PowerFarm institutional Authority. */
export async function requireRegistryControlRole(role: "admin" | "oauth_admin") {
  const principal = await currentRegistryPrincipal();
  if (!principal) return null;
  const supabase = await supabaseServer();
  const { data: allowed, error } = await supabase.rpc("has_registry_control_role", { p_role: role });
  if (error || !allowed) return null;
  return principal;
}
