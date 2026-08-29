"use client";

import { IdentitySurface } from "@powerfarm/identity-ui";
import { passkeyCapabilitiesReady } from "@powerfarm/identity-ui/machine";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { authorizationRoute } from "../lib/auth-flow.mjs";
import { createIdentityAdapter } from "../lib/identity-adapter.mjs";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type IdentityLoginHostProps = {
  authorizationId?: string;
  setupPasskey: boolean;
  result?: "expired" | "complete";
};

export function IdentityLoginHost({ authorizationId, setupPasskey, result }: IdentityLoginHostProps) {
  const router = useRouter();
  const [passkeyAvailable, setPasskeyAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    setPasskeyAvailable(
      "PublicKeyCredential" in window && Boolean(window.navigator.credentials),
    );
  }, []);
  const adapter = useMemo(() => {
    const client = getSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    return createIdentityAdapter({
      client,
      callbackUrl: process.env.NEXT_PUBLIC_IDENTITY_BASE_URL!,
      authorizationId,
      passkeyAvailable: passkeyAvailable ?? false,
    });
  }, [authorizationId, passkeyAvailable]);

  if (result === "complete") {
    return (
      <main className="pf-consent-stage">
        <section className="pf-consent-panel">
          <div className="pf-identity-kicker">
            <span className="pf-brand-logo pf-brand-wordmark-horizontal-cream" />
            <span>Identity</span>
          </div>
          <h1>Identidade confirmada.</h1>
          <p className="pf-identity-intro">Você já pode fechar esta janela ou voltar ao aplicativo.</p>
        </section>
      </main>
    );
  }

  if (!passkeyCapabilitiesReady(passkeyAvailable)) {
    return (
      <main className="pf-identity-stage" aria-busy="true" aria-label="Preparando identidade" />
    );
  }

  return (
    <>
      {result === "expired" ? (
        <p className="pf-identity-host-notice" role="alert">
          O link expirou ou já foi usado. Peça um novo acesso.
        </p>
      ) : null}
      <IdentitySurface
        adapter={adapter}
        context={{ authorizationId }}
        setupPasskey={setupPasskey}
        onComplete={() => {
          const target = authorizationRoute(authorizationId);
          router.replace(target === "/" ? "/login?result=complete" : target);
        }}
      />
    </>
  );
}
