# Powerfarm Registry

Canonical durable truth and identity substrate for Powerfarm v0.1.

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
```

The build requires `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Apply migrations from the repository;
do not create this state manually in the Supabase dashboard.

After authentication, open `/gadgets/hello-agentic`. The page reads and edits
the same `powerfarm_gadget_get_draft` state exposed to the Workspace capability.
Stale edits return `revision_conflict`. Publication remains a distinct
Gatekeeper-approved operation: the private Engine validates the exact source
before Registry creates an immutable revision.
