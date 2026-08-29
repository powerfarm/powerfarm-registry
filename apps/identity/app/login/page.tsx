import { IdentityLoginHost } from "../../components/IdentityLoginHost";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const authorizationId = one(query.authorization_id);
  const setupPasskey = one(query.setup) === "passkey";
  const result = one(query.result);

  return (
    <IdentityLoginHost
      authorizationId={authorizationId}
      setupPasskey={setupPasskey}
      result={result === "expired" || result === "complete" ? result : undefined}
    />
  );
}
