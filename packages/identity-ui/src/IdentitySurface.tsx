"use client";

import { FormEvent, useEffect, useReducer, useRef } from "react";
import type {
  IdentityActionResult,
  IdentityAdapter,
  IdentityComplete,
  IdentityContext,
} from "./identity-types";
import { createIdentityState, reduceIdentityState } from "./machine.mjs";

type IdentitySurfaceProps = {
  adapter: IdentityAdapter;
  context?: IdentityContext;
  setupPasskey?: boolean;
  onComplete(complete: IdentityComplete): void;
};

const busyScreens = new Set([
  "sending-link",
  "sending-confirmation",
  "authenticating-passkey",
  "checking-session",
  "registering-passkey",
]);

export function IdentitySurface({
  adapter,
  context = {},
  setupPasskey = true,
  onComplete,
}: IdentitySurfaceProps) {
  const [state, dispatch] = useReducer(
    reduceIdentityState,
    { passkeyAvailable: adapter.passkeyAvailable, setupPasskey },
    createIdentityState,
  );
  const completed = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const busy = busyScreens.has(state.screen);

  function complete(result: IdentityComplete) {
    if (completed.current) return;
    completed.current = true;
    onComplete(result);
  }

  useEffect(() => {
    let active = true;
    dispatch({ type: "session.checking" });
    adapter.inspectSession().then((session) => {
      if (!active || !session.authenticated || !session.confirmed || session.anonymous) {
        if (active) dispatch({ type: "signin.chosen" });
        return;
      }
      dispatch({ type: "session.confirmed", hasPasskey: session.hasPasskey });
      if (!setupPasskey || !adapter.passkeyAvailable || session.hasPasskey) {
        complete({ method: "magic-link", passkeyRegistered: session.hasPasskey });
      }
    }).catch(() => {
      if (active) dispatch({ type: "signin.chosen" });
    });
    return () => { active = false; };
  }, [adapter, setupPasskey]);

  useEffect(() => {
    if (state.screen === "recover-with-email") emailRef.current?.focus();
  }, [state.screen]);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.email || busy) return;
    dispatch({ type: "link.requested" });
    const result = await adapter.requestMagicLink(state.email, state.intent);
    if (result.ok) {
      dispatch({ type: "link.sent" });
      return;
    }
    dispatch(result.kind === "rate-limited"
      ? { type: "link.rate-limited", retryAfterSeconds: result.retryAfterSeconds }
      : { type: "failure", message: "Não foi possível enviar agora. Tente novamente." });
  }

  function recoverFromPasskey(result: IdentityActionResult) {
    if (result.ok) return;
    if (result.kind === "cancelled") dispatch({ type: "passkey.cancelled" });
    else if (result.kind === "unavailable") dispatch({ type: "passkey.unavailable" });
    else dispatch({ type: "failure", message: "Não foi possível confirmar a passkey." });
  }

  async function signInWithPasskey() {
    if (busy) return;
    dispatch({ type: "passkey.requested" });
    const result = await adapter.signInWithPasskey();
    if (!result.ok) {
      recoverFromPasskey(result);
      return;
    }
    dispatch({ type: "passkey.authenticated" });
    complete({ method: "passkey", passkeyRegistered: true });
  }

  async function registerPasskey() {
    if (busy) return;
    dispatch({ type: "passkey.registration-requested" });
    const result = await adapter.registerPasskey();
    if (!result.ok) {
      recoverFromPasskey(result);
      return;
    }
    dispatch({ type: "passkey.registered" });
    complete({ method: "magic-link", passkeyRegistered: true });
  }

  function skipPasskey() {
    dispatch({ type: "passkey.skipped" });
    complete({ method: "magic-link", passkeyRegistered: false });
  }

  const signup = state.intent === "sign-up";
  const waitingForEmail = state.screen === "link-sent" || state.screen === "confirmation-sent";

  return (
    <main className="pf-identity-stage">
      <section className="pf-identity-mark" aria-hidden="true">
        <span className="pf-brand-logo pf-brand-symbol-master pf-identity-symbol" />
        <span className="pf-identity-seam" />
      </section>

      <section className="pf-identity-panel" aria-labelledby="identity-title">
        <div className="pf-identity-kicker">
          <span className="pf-brand-logo pf-brand-wordmark-horizontal-cream" />
          <span>Identity</span>
        </div>
        <h1 id="identity-title">
          {context.requestingApp ? `Entre para usar ${context.requestingApp}` : "Sua identidade Powerfarm"}
        </h1>
        <p className="pf-identity-intro">
          {signup
            ? "Um endereço. Nenhuma senha. Confirme por email e, se quiser, crie uma passkey."
            : "Continue com magic link ou use uma passkey já registrada."}
        </p>

        {state.screen === "offer-passkey" ? (
          <div className="pf-identity-enrollment">
            <p>Este dispositivo pode guardar uma passkey para seus próximos acessos.</p>
            <button className="pf-identity-primary" type="button" onClick={registerPasskey} disabled={busy}>
              Criar passkey agora
            </button>
            <button className="pf-identity-text-action" type="button" onClick={skipPasskey} disabled={busy}>
              Agora não
            </button>
          </div>
        ) : (
          <form className="pf-identity-form" onSubmit={requestLink}>
            <label htmlFor="identity-email">Email</label>
            <input
              ref={emailRef}
              id="identity-email"
              name="email"
              type="email"
              autoComplete="username webauthn"
              inputMode="email"
              value={state.email}
              onChange={(event) => dispatch({ type: "email.changed", email: event.target.value })}
              disabled={busy || waitingForEmail}
              required
            />
            <button className="pf-identity-primary" type="submit" disabled={busy || waitingForEmail || !state.email}>
              {signup ? "Criar conta" : "Enviar magic link"}
            </button>
            {adapter.passkeyAvailable && !signup && !waitingForEmail ? (
              <button className="pf-identity-secondary" type="button" onClick={signInWithPasskey} disabled={busy}>
                Entrar com passkey
              </button>
            ) : null}
            {!waitingForEmail ? (
              <button
                className="pf-identity-text-action"
                type="button"
                disabled={busy}
                onClick={() => dispatch({ type: signup ? "signin.chosen" : "signup.chosen" })}
              >
                {signup ? "Já tem acesso? Entrar" : "Novo por aqui? Criar conta"}
              </button>
            ) : null}
          </form>
        )}

        <div className="pf-identity-feedback" aria-live="polite" aria-atomic="true">
          {state.error ? <p role="alert">{state.error}</p> : null}
          {state.notice ? <p>{state.notice}</p> : null}
        </div>
      </section>
    </main>
  );
}
