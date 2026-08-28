"use client";

import { useState } from "react";

type ConsentDecision = {
  authorizationId: string;
  decision: "approve" | "deny";
};

type ConsentSurfaceProps = {
  client: { name: string; logoUrl?: string };
  scopes: Array<{ name: string; description?: string }>;
  redirectUri: string;
  authorizationId: string;
  action(decision: ConsentDecision): Promise<void>;
};

export function ConsentSurface({
  client,
  scopes,
  redirectUri,
  authorizationId,
  action,
}: ConsentSurfaceProps) {
  const [pending, setPending] = useState<ConsentDecision["decision"] | null>(null);

  async function decide(decision: ConsentDecision["decision"]) {
    setPending(decision);
    try {
      if (decision === "approve") await action({ authorizationId, decision: "approve" });
      else await action({ authorizationId, decision: "deny" });
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="pf-consent-stage">
      <section className="pf-consent-panel" aria-labelledby="consent-title">
        <div className="pf-identity-kicker">
          <span className="pf-brand-logo pf-brand-wordmark-horizontal-cream" />
          <span>Authorization</span>
        </div>
        <p className="pf-consent-app">{client.name}</p>
        <h1 id="consent-title">Permitir acesso à sua identidade?</h1>
        <ul className="pf-consent-scopes">
          {scopes.map((scope) => (
            <li key={scope.name}>
              <strong>{scope.name}</strong>
              {scope.description ? <span>{scope.description}</span> : null}
            </li>
          ))}
        </ul>
        <p className="pf-consent-destination">Retorno autorizado para {redirectUri}</p>
        <div className="pf-consent-actions">
          <button className="pf-identity-primary" type="button" disabled={pending !== null} onClick={() => decide("approve")}>
            {pending === "approve" ? "Permitindo…" : "Permitir"}
          </button>
          <button className="pf-identity-secondary" type="button" disabled={pending !== null} onClick={() => decide("deny")}>
            {pending === "deny" ? "Negando…" : "Negar"}
          </button>
        </div>
      </section>
    </main>
  );
}
