import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeOAuthClientInput } from "@/lib/oauth-admin.mjs";
import { requireRegistryControlRole } from "@/lib/registry-admin";
import { supabaseServer } from "@/lib/supabase-server";

function providerAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authorized() {
  return await requireRegistryControlRole("oauth_admin")
    ?? await requireRegistryControlRole("admin");
}

export async function GET() {
  if (!await authorized()) {
    return NextResponse.json({ error: "acesso administrativo do Registry necessário" }, { status: 403 });
  }
  const [{ data: providerData, error: providerError }, { data: links, error: linkError }] = await Promise.all([
    providerAdmin().auth.admin.oauth.listClients(),
    (await supabaseServer()).from("app_oauth_clients").select(
      "oauth_client_id, environment, status, created_at, identities!app_oauth_clients_app_identity_id_fkey(name)",
    ),
  ]);
  if (providerError || linkError) {
    return NextResponse.json({ error: "não foi possível carregar os clientes OAuth" }, { status: 400 });
  }
  const linked = new Map((links ?? []).map((link) => [link.oauth_client_id, link]));
  const clients = (providerData.clients ?? []).map(({ client_secret: _secret, ...client }) => ({
    ...client,
    registry: linked.get(client.client_id) ?? null,
  }));
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const principal = await authorized();
  if (!principal) {
    return NextResponse.json({ error: "acesso administrativo do Registry necessário" }, { status: 403 });
  }
  let input;
  try {
    input = normalizeOAuthClientInput(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "entrada inválida" }, { status: 400 });
  }
  const supabase = await supabaseServer();
  const { data: existingIdentity } = await supabase.from("identities").select("id")
    .eq("kind", "app").eq("name", input.clientName).maybeSingle();
  let appIdentityId = existingIdentity?.id;
  if (!appIdentityId) {
    const { data: createdIdentity, error: identityError } = await supabase.from("identities").insert({
      kind: "app", name: input.clientName, mandate: `OAuth ${input.environment}: ${input.scope}`,
      created_by: principal.identityId,
    }).select("id").single();
    if (identityError) {
      return NextResponse.json({ error: "não foi possível criar a identidade do app" }, { status: 400 });
    }
    appIdentityId = createdIdentity.id;
  }
  const { data: client, error: providerError } = await providerAdmin().auth.admin.oauth.createClient({
    client_name: input.clientName,
    client_uri: input.clientUri,
    redirect_uris: input.redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: input.scope,
    token_endpoint_auth_method: input.clientType === "public" ? "none" : "client_secret_basic",
  });
  if (providerError) {
    return NextResponse.json({ error: "o emissor recusou o cliente OAuth" }, { status: 400 });
  }
  const { error: linkError } = await supabase.from("app_oauth_clients").insert({
    app_identity_id: appIdentityId,
    oauth_client_id: client.client_id,
    environment: input.environment,
    status: "pending_verification",
    created_by: principal.identityId,
  });
  return NextResponse.json({
    client,
    registry: { linked: !linkError, status: linkError ? "unlinked" : "pending_verification" },
  }, { status: linkError ? 409 : 201 });
}
