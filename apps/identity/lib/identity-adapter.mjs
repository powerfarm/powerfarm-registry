import { buildCallbackUrl } from "./auth-flow.mjs";

const messages = {
  cancelled: "A operação foi cancelada.",
  unavailable: "Passkey indisponível neste dispositivo.",
  expired: "A confirmação expirou. Tente novamente.",
  failure: "Não foi possível confirmar a identidade.",
};

function isRateLimited(error) {
  return error?.status === 429 || error?.code === "over_request_rate_limit";
}

function passkeyFailure(error) {
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? "").toLowerCase();
  const name = String(error?.name ?? "").toLowerCase();

  let kind = "failure";
  if (name === "aborterror" || code.includes("cancel") || code.includes("abort")) {
    kind = "cancelled";
  } else if (
    code === "passkey_disabled" ||
    code.includes("not_supported") ||
    message.includes("does not support webauthn") ||
    message.includes("experimental and disabled")
  ) {
    kind = "unavailable";
  } else if (code.includes("expired") || message.includes("challenge expired")) {
    kind = "expired";
  }

  return { ok: false, kind, message: messages[kind] };
}

export function createIdentityAdapter({
  client,
  callbackUrl,
  authorizationId,
  passkeyAvailable = false,
}) {
  async function inspectSession() {
    const { data, error } = await client.auth.getUser();
    const user = error ? null : data?.user;
    if (!user) {
      return { authenticated: false, confirmed: false, anonymous: false, hasPasskey: false };
    }

    const anonymous = user.is_anonymous === true;
    const confirmed = !anonymous && Boolean(user.email_confirmed_at || user.confirmed_at);
    if (!confirmed) {
      return { authenticated: true, confirmed: false, anonymous, hasPasskey: false };
    }

    const listed = await client.auth.passkey.list();
    return {
      authenticated: true,
      confirmed: true,
      anonymous: false,
      hasPasskey: !listed.error && Array.isArray(listed.data) && listed.data.length > 0,
    };
  }

  return {
    passkeyAvailable,

    async requestMagicLink(email, intent) {
      try {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: buildCallbackUrl(callbackUrl, authorizationId),
            shouldCreateUser: intent === "sign-up",
          },
        });
        if (isRateLimited(error)) {
          return {
            ok: false,
            kind: "rate-limited",
            message: "Tente novamente em alguns instantes.",
          };
        }
      } catch (error) {
        if (isRateLimited(error)) {
          return {
            ok: false,
            kind: "rate-limited",
            message: "Tente novamente em alguns instantes.",
          };
        }
      }
      return { ok: true, kind: "link-sent" };
    },

    inspectSession,

    async signInWithPasskey() {
      if (!passkeyAvailable) return passkeyFailure({ code: "passkey_disabled" });
      try {
        const { error } = await client.auth.signInWithPasskey();
        if (error) return passkeyFailure(error);
        return { ok: true, kind: "authenticated", hasPasskey: true };
      } catch (error) {
        return passkeyFailure(error);
      }
    },

    async registerPasskey() {
      if (!passkeyAvailable) return passkeyFailure({ code: "passkey_disabled" });
      try {
        const session = await inspectSession();
        if (!session.authenticated || !session.confirmed || session.anonymous) {
          return { ok: false, kind: "failure", message: messages.failure };
        }
        const { error } = await client.auth.registerPasskey();
        if (error) return passkeyFailure(error);
        return { ok: true, kind: "passkey-registered", hasPasskey: true };
      } catch (error) {
        return passkeyFailure(error);
      }
    },
  };
}
