import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyConsent({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const identityBase = process.env.NEXT_PUBLIC_IDENTITY_BASE_URL;
  if (!identityBase) throw new Error("Missing NEXT_PUBLIC_IDENTITY_BASE_URL");
  const authorizationId = (await searchParams).authorization_id?.trim();
  const target = new URL(authorizationId ? "/oauth/consent" : "/login", identityBase);
  if (authorizationId) target.searchParams.set("authorization_id", authorizationId);
  redirect(target.toString());
}
