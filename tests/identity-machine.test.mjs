import assert from "node:assert/strict";
import test from "node:test";
import {
  createIdentityState,
  reduceIdentityState,
} from "../packages/identity-ui/src/machine.mjs";

function transition(state, ...events) {
  return events.reduce(reduceIdentityState, state);
}

test("identity bootstrap waits until passkey capability is resolved", () => {
  const pending = createIdentityState({ passkeyAvailable: null });
  const unsupported = createIdentityState({ passkeyAvailable: false });
  const supported = createIdentityState({ passkeyAvailable: true });

  assert.equal(pending.capabilitiesReady, false);
  assert.equal(unsupported.capabilitiesReady, true);
  assert.equal(supported.capabilitiesReady, true);
});

test("email survives sign-up and passkey fallback transitions", () => {
  const state = transition(
    createIdentityState({ passkeyAvailable: true }),
    { type: "email.changed", email: "dan@powerfarm.app" },
    { type: "signup.chosen" },
    { type: "link.requested" },
    { type: "passkey.unavailable" },
  );

  assert.equal(state.email, "dan@powerfarm.app");
  assert.equal(state.intent, "sign-up");
  assert.equal(state.screen, "recover-with-email");
});

test("confirmed authentication offers passkey enrollment when requested", () => {
  const state = transition(
    createIdentityState({ passkeyAvailable: true, setupPasskey: true }),
    { type: "email.changed", email: "dan@powerfarm.app" },
    { type: "session.checking" },
    { type: "session.confirmed", hasPasskey: false },
  );

  assert.equal(state.screen, "offer-passkey");
  assert.equal(state.email, "dan@powerfarm.app");
});

test("existing passkey authentication completes the identity flow", () => {
  const state = transition(
    createIdentityState({ passkeyAvailable: true }),
    { type: "passkey.requested" },
    { type: "passkey.authenticated" },
  );

  assert.equal(state.screen, "complete");
  assert.equal(state.notice, "Identidade confirmada com passkey.");
});

test("magic-link completion is neutral for sign-in and sign-up", () => {
  const signIn = transition(
    createIdentityState(),
    { type: "email.changed", email: "person@example.com" },
    { type: "link.requested" },
    { type: "link.sent" },
  );
  const signUp = transition(
    createIdentityState(),
    { type: "email.changed", email: "person@example.com" },
    { type: "signup.chosen" },
    { type: "link.requested" },
    { type: "link.sent" },
  );

  assert.equal(signIn.screen, "link-sent");
  assert.equal(signUp.screen, "confirmation-sent");
  assert.equal(signIn.notice, signUp.notice);
  assert.equal(signIn.notice, "Se o endereço puder continuar, enviaremos as instruções por email.");
});

test("rate limiting keeps the email and offers email recovery", () => {
  const state = transition(
    createIdentityState(),
    { type: "email.changed", email: "person@example.com" },
    { type: "link.requested" },
    { type: "link.rate-limited", retryAfterSeconds: 60 },
  );

  assert.equal(state.screen, "recover-with-email");
  assert.equal(state.email, "person@example.com");
  assert.equal(state.error, "Tente novamente em alguns instantes.");
});

test("unsupported or cancelled passkey falls back to the same email", () => {
  for (const event of [
    { type: "passkey.unavailable" },
    { type: "passkey.cancelled" },
  ]) {
    const state = transition(
      createIdentityState({ passkeyAvailable: true }),
      { type: "email.changed", email: "person@example.com" },
      { type: "passkey.requested" },
      event,
    );
    assert.equal(state.screen, "recover-with-email");
    assert.equal(state.email, "person@example.com");
  }
});

test("passkey registration and explicit skip both complete", () => {
  const offered = transition(
    createIdentityState({ passkeyAvailable: true, setupPasskey: true }),
    { type: "session.confirmed", hasPasskey: false },
  );

  const registered = transition(
    offered,
    { type: "passkey.registration-requested" },
    { type: "passkey.registered" },
  );
  const skipped = reduceIdentityState(offered, { type: "passkey.skipped" });

  assert.equal(registered.screen, "complete");
  assert.equal(registered.notice, "Passkey criada. Sua identidade está pronta.");
  assert.equal(skipped.screen, "complete");
});

test("only email.changed may replace the stored email", () => {
  const initial = reduceIdentityState(createIdentityState(), {
    type: "email.changed",
    email: "first@example.com",
  });
  const events = [
    { type: "signup.chosen" },
    { type: "link.requested" },
    { type: "link.sent" },
    { type: "session.checking" },
    { type: "failure", message: "Falhou." },
  ];

  let state = initial;
  for (const event of events) {
    state = reduceIdentityState(state, event);
    assert.equal(state.email, "first@example.com");
  }
});

test("unknown events are rejected explicitly", () => {
  assert.throws(
    () => reduceIdentityState(createIdentityState(), { type: "mystery.event" }),
    /invalid identity event: mystery\.event/,
  );
});
