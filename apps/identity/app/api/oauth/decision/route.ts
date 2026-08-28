import { NextResponse } from "next/server";
import { decideOAuth, type OAuthDecision } from "@/lib/oauth-decision";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function isDecision(value: FormDataEntryValue | null): value is OAuthDecision {
  return value === "approve" || value === "deny";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const authorizationId = form.get("authorization_id");
  const decision = form.get("decision");
  if (typeof authorizationId !== "string" || !authorizationId || !isDecision(decision)) {
    return NextResponse.json({ error: "invalid authorization decision" }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseServerClient();
    const target = await decideOAuth(supabase, authorizationId, decision);
    return NextResponse.redirect(target, { status: 303 });
  } catch {
    return NextResponse.json({ error: "authorization decision failed" }, { status: 400 });
  }
}
