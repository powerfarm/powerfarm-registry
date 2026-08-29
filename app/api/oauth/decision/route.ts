import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "consent moved to Powerfarm Identity" }, { status: 410 });
}
