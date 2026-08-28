const NEUTRAL_LINK_NOTICE =
  "Se o endereço puder continuar, enviaremos as instruções por email.";

export function createIdentityState(options = {}) {
  return {
    screen: "idle",
    intent: "sign-in",
    email: "",
    passkeyAvailable: options.passkeyAvailable ?? false,
    setupPasskey: options.setupPasskey ?? false,
    notice: null,
    error: null,
  };
}

function move(state, screen, changes = {}) {
  return {
    ...state,
    screen,
    error: null,
    ...changes,
  };
}

export function reduceIdentityState(state, event) {
  switch (event.type) {
    case "email.changed":
      return { ...state, email: event.email, error: null };
    case "signup.chosen":
      return move(state, "idle", { intent: "sign-up", notice: null });
    case "signin.chosen":
      return move(state, "idle", { intent: "sign-in", notice: null });
    case "link.requested":
      return move(
        state,
        state.intent === "sign-up" ? "sending-confirmation" : "sending-link",
        { notice: null },
      );
    case "link.sent":
      return move(
        state,
        state.intent === "sign-up" ? "confirmation-sent" : "link-sent",
        { notice: NEUTRAL_LINK_NOTICE },
      );
    case "link.rate-limited":
      return move(state, "recover-with-email", {
        notice: null,
        error: "Tente novamente em alguns instantes.",
      });
    case "passkey.requested":
      return move(state, "authenticating-passkey", { notice: null });
    case "passkey.cancelled":
      return move(state, "recover-with-email", {
        notice: null,
        error: "A passkey foi cancelada. Você pode continuar por email.",
      });
    case "passkey.unavailable":
      return move(state, "recover-with-email", {
        passkeyAvailable: false,
        notice: null,
        error: "Passkey indisponível neste dispositivo. Continue por email.",
      });
    case "passkey.authenticated":
      return move(state, "complete", {
        notice: "Identidade confirmada com passkey.",
      });
    case "session.checking":
      return move(state, "checking-session", { notice: null });
    case "session.confirmed":
      if (state.setupPasskey && state.passkeyAvailable && !event.hasPasskey) {
        return move(state, "offer-passkey", {
          notice: "Crie uma passkey para entrar mais rápido da próxima vez.",
        });
      }
      return move(state, "complete", { notice: "Identidade confirmada." });
    case "passkey.registration-requested":
      return move(state, "registering-passkey", { notice: null });
    case "passkey.registered":
      return move(state, "complete", {
        notice: "Passkey criada. Sua identidade está pronta.",
      });
    case "passkey.skipped":
      return move(state, "complete", { notice: "Identidade confirmada." });
    case "failure":
      return move(state, "failure", {
        notice: null,
        error: event.message || "Não foi possível continuar.",
      });
    default:
      throw new Error(`invalid identity event: ${event.type}`);
  }
}
