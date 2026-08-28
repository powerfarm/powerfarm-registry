export type IdentityFailureKind =
  | "cancelled"
  | "unavailable"
  | "rate-limited"
  | "expired"
  | "failure";

export type IdentityActionResult =
  | {
      ok: true;
      kind: "link-sent" | "authenticated" | "passkey-registered";
      hasPasskey?: boolean;
    }
  | {
      ok: false;
      kind: IdentityFailureKind;
      message: string;
      retryAfterSeconds?: number;
    };

export type IdentityAdapter = {
  passkeyAvailable: boolean;
  requestMagicLink(
    email: string,
    intent: "sign-in" | "sign-up",
  ): Promise<IdentityActionResult>;
  inspectSession(): Promise<{
    authenticated: boolean;
    confirmed: boolean;
    anonymous: boolean;
    hasPasskey: boolean;
  }>;
  signInWithPasskey(): Promise<IdentityActionResult>;
  registerPasskey(): Promise<IdentityActionResult>;
};

export type IdentityContext = {
  requestingApp?: string;
  authorizationId?: string;
};

export type IdentityComplete = {
  method: "magic-link" | "passkey";
  passkeyRegistered: boolean;
};
