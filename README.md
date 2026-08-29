# Powerfarm Registry + Identity

Canonical durable truth, identity host, and brand-backed interface substrate for
Powerfarm v0.1. The monorepo contains two applications:

- the Registry at the repository root;
- the separately buildable Identity candidate in `apps/identity`.

Both consume the same `@powerfarm/brand` and `@powerfarm/ui-core` packages.
Identity adds one provider-neutral `@powerfarm/identity-ui`; applications do not
copy the Powerfarm visual source or implement their own login screen.

The Gadget authoring contract is one lineage:

`mutable draft → optimistic patch → Engine validation → immutable revision → installed exact revision`

Supabase owns workspace membership, Gadget drafts/revisions/installations,
RunGrants, runs, ADK sessions/events/checkpoints/effects, provenance, and
idempotency facts. OAuth/provider credentials are not stored in those records.

## Verify

```sh
npm test
npx tsc --noEmit
npm run build
npm run identity:build
```

The builds require:

```text
NEXT_PUBLIC_IDENTITY_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Run the Registry with `npm run dev` and Identity with `npm run identity:dev`.
Apply migrations from the repository; do not create this state manually in the
Supabase dashboard.

Identity is passwordless: existing humans request a magic link or use a
registered passkey; account creation explicitly sends a confirmation link and
may then enroll a passkey. The same host owns the OAuth 2.1 consent surface and
uses only issuer-returned redirect URLs.

## Passkey preview boundary

WebAuthn credentials are bound to a relying-party ID and allowed origins. Live
passkey testing therefore needs one stable preview domain whose origins match
the configured RP ID. A random `vercel.app` preview cannot share passkeys with
the future `id.powerfarm.app` RP ID. This repository prepares the host but does
not mutate Supabase Auth, Vercel domains, DNS, OAuth clients, or production RP
settings.

After authentication, open `/gadgets/hello-agentic`. The page reads and edits
the same `powerfarm_gadget_get_draft` state exposed to the Workspace capability.
Stale edits return `revision_conflict`. Publication remains a distinct
Gatekeeper-approved operation: the private Engine validates the exact source
before Registry creates an immutable revision.
