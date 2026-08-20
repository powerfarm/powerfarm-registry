import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * A decisao do consentimento. Quem aprova e o utilizador com sessao; quem
 * emite o codigo e devolve o destino e o emissor. Nenhum redirect nasce aqui.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const decision = form.get("decision");
  const authorizationId = form.get("authorization_id");
  if (typeof authorizationId !== "string" || !authorizationId) {
    return NextResponse.json({ error: "falta authorization_id" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data, error } = decision === "approve"
    ? await supabase.auth.oauth.approveAuthorization(authorizationId)
    : await supabase.auth.oauth.denyAuthorization(authorizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(data.redirect_url, { status: 303 });
}
