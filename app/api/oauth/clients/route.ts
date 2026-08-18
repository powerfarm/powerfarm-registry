import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Administrar clientes OAuth exige a service key. Ela vive so aqui, no servidor,
 * e nunca toca nas nossas tabelas — essas levam sempre o JWT do utilizador.
 */
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

async function autenticado() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!await autenticado()) return NextResponse.json({ error: "sem sessao" }, { status: 401 });
  const { data, error } = await (admin().auth.admin as any).oauth.listClients();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  if (!await autenticado()) return NextResponse.json({ error: "sem sessao" }, { status: 401 });
  const body = await request.json();
  const { data, error } = await (admin().auth.admin as any).oauth.createClient({
    name: body.name,
    redirect_uris: String(body.redirect_uris || "")
      .split(/[\s,]+/).filter(Boolean),
    client_type: body.client_type || "confidential",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ client: data });
}
