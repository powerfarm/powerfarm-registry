# Supabase Migration Custody Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the Registry's committed migration sources with the migrations already applied to the Powerfarm Supabase project, remove the local `0004` collision without rewriting remote history, and make future drift fail locally and in CI.

**Architecture:** A committed JSON receipt records the currently observed remote migration ledger. A pure Node.js parity checker compares that receipt with `supabase/migrations`, rejects duplicate versions, and proves that every applied remote entry has an exact source file. The unapplied Brand migration moves forward to a unique timestamp; no migration is applied and no live table is changed in this plan.

**Tech Stack:** Node.js 22 built-ins, `node:test`, npm scripts, Supabase CLI, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-08-28-superstructure-registry-identity-design.md`

## Global Constraints

- Migrations applied to the live Supabase project are never renamed, renumbered, edited, reverted, or reset.
- `0004_adk_runtime.sql` remains the source for the already applied `0004 adk_runtime` migration.
- `0004_admit_brand_v03.sql` has not been applied and must move to `20260828170000_admit_brand_v03.sql`.
- The applied ledger is `0001 identity`, `0002 manifest`, `0003 autoridade`, `0004 adk_runtime`, `0005 adk_runtime_advisors`, and `20260820192536 gadget_lineage`.
- The parity guard may read the migration directory and committed receipt only; it must not connect to the database or require secrets in CI.
- Processes remain in Neon. ADK and Cloudflare OS migrations remain in custody but gain no new Registry dependency.
- This plan creates no database objects and performs no Supabase push.

---

## File map

- `supabase/migrations/applied-ledger.json`: committed receipt of the migration ledger observed on the live Powerfarm project on 2026-08-28.
- `scripts/migration-parity.mjs`: pure parser and parity rules reusable by tests and the command-line check.
- `scripts/check-migration-parity.mjs`: CLI entrypoint that reads the receipt and migration directory, prints one compact receipt, and exits non-zero on drift.
- `tests/migration-parity.test.mjs`: behavior tests for missing sources, duplicate versions, name mismatches, and valid forward-only local migrations.
- `tests/migrations.test.mjs`: existing topology assertions updated for the renumbered unapplied Brand migration.
- `package.json`: exposes `npm run migrations:check` and makes the parity check part of `npm test`.
- `.github/workflows/quality.yml`: runs the same test and parity commands on pull requests and `main`.
- `docs/operations/supabase-migration-custody.md`: operator procedure for refreshing the receipt from a read-only live query and deciding whether a migration may be pushed.

### Task 1: Encode migration parity as a pure contract

**Files:**
- Create: `scripts/migration-parity.mjs`
- Create: `tests/migration-parity.test.mjs`

**Interfaces:**
- Consumes: `ledger: Array<{ version: string; name: string; source: string }>` and `localFiles: string[]`.
- Produces: `migrationVersion(file: string): string | null` and `checkMigrationParity({ ledger, localFiles }): { applied: number; local: number; pending: string[] }`.
- Throws: `Error` whose message begins with `migration parity failed:` and contains every detected violation.

- [ ] **Step 1: Write the failing tests for a valid ledger and forward migration**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { checkMigrationParity, migrationVersion } from "../scripts/migration-parity.mjs";

const ledger = [
  { version: "0001", name: "identity", source: "0001_identity.sql" },
  { version: "0002", name: "manifest", source: "0002_manifest.sql" },
];

test("extracts the numeric migration version", () => {
  assert.equal(migrationVersion("0001_identity.sql"), "0001");
  assert.equal(migrationVersion("20260828170000_admit_brand_v03.sql"), "20260828170000");
  assert.equal(migrationVersion("README.md"), null);
});

test("accepts exact applied sources plus a unique forward migration", () => {
  assert.deepEqual(checkMigrationParity({
    ledger,
    localFiles: [
      "0001_identity.sql",
      "0002_manifest.sql",
      "20260828170000_admit_brand_v03.sql",
    ],
  }), {
    applied: 2,
    local: 3,
    pending: ["20260828170000_admit_brand_v03.sql"],
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing module failure**

Run: `node --test tests/migration-parity.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/migration-parity.mjs`.

- [ ] **Step 3: Implement version parsing and the valid-path result**

```js
export function migrationVersion(file) {
  return /^(\d+)_.*\.sql$/.exec(file)?.[1] ?? null;
}

export function checkMigrationParity({ ledger, localFiles }) {
  const sqlFiles = localFiles.filter((file) => migrationVersion(file));
  const appliedSources = new Set(ledger.map((entry) => entry.source));
  return {
    applied: ledger.length,
    local: sqlFiles.length,
    pending: sqlFiles.filter((file) => !appliedSources.has(file)).sort(),
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/migration-parity.test.mjs`

Expected: PASS with 2 tests.

- [ ] **Step 5: Add failing tests for all drift classes**

```js
test("rejects an applied migration without its exact source", () => {
  assert.throws(
    () => checkMigrationParity({ ledger, localFiles: ["0001_identity.sql"] }),
    /missing applied source 0002_manifest\.sql/,
  );
});

test("rejects two local files with the same version", () => {
  assert.throws(
    () => checkMigrationParity({
      ledger,
      localFiles: ["0001_identity.sql", "0002_manifest.sql", "0002_other.sql"],
    }),
    /duplicate local version 0002: 0002_manifest\.sql, 0002_other\.sql/,
  );
});

test("rejects a ledger name that does not match its source filename", () => {
  assert.throws(
    () => checkMigrationParity({
      ledger: [{ version: "0001", name: "wrong", source: "0001_identity.sql" }],
      localFiles: ["0001_identity.sql"],
    }),
    /ledger name wrong does not match source name identity/,
  );
});

test("rejects duplicate versions in the committed ledger", () => {
  assert.throws(
    () => checkMigrationParity({
      ledger: [
        { version: "0001", name: "identity", source: "0001_identity.sql" },
        { version: "0001", name: "other", source: "0001_other.sql" },
      ],
      localFiles: ["0001_identity.sql", "0001_other.sql"],
    }),
    /duplicate ledger version 0001/,
  );
});
```

- [ ] **Step 6: Run the test and verify the new cases fail**

Run: `node --test tests/migration-parity.test.mjs`

Expected: 2 PASS and 4 FAIL because validation has not been added.

- [ ] **Step 7: Implement complete validation**

```js
function duplicates(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([item]) => item);
}

function sourceName(source) {
  return /^(?:\d+)_(.*)\.sql$/.exec(source)?.[1] ?? "";
}

export function migrationVersion(file) {
  return /^(\d+)_.*\.sql$/.exec(file)?.[1] ?? null;
}

export function checkMigrationParity({ ledger, localFiles }) {
  const errors = [];
  const sqlFiles = localFiles.filter((file) => migrationVersion(file)).sort();
  const localByVersion = new Map();

  for (const file of sqlFiles) {
    const version = migrationVersion(file);
    localByVersion.set(version, [...(localByVersion.get(version) ?? []), file]);
  }

  for (const version of duplicates(ledger.map((entry) => entry.version))) {
    errors.push(`duplicate ledger version ${version}`);
  }
  for (const [version, files] of localByVersion) {
    if (files.length > 1) errors.push(`duplicate local version ${version}: ${files.join(", ")}`);
  }
  for (const entry of ledger) {
    if (!sqlFiles.includes(entry.source)) errors.push(`missing applied source ${entry.source}`);
    if (migrationVersion(entry.source) !== entry.version) {
      errors.push(`ledger version ${entry.version} does not match source ${entry.source}`);
    }
    const name = sourceName(entry.source);
    if (name !== entry.name) errors.push(`ledger name ${entry.name} does not match source name ${name}`);
  }

  if (errors.length) throw new Error(`migration parity failed:\n- ${errors.join("\n- ")}`);

  const appliedSources = new Set(ledger.map((entry) => entry.source));
  return {
    applied: ledger.length,
    local: sqlFiles.length,
    pending: sqlFiles.filter((file) => !appliedSources.has(file)).sort(),
  };
}
```

- [ ] **Step 8: Run the focused test and verify every case passes**

Run: `node --test tests/migration-parity.test.mjs`

Expected: PASS with 6 tests.

- [ ] **Step 9: Commit the pure parity contract**

```bash
git add scripts/migration-parity.mjs tests/migration-parity.test.mjs
git commit -m "test: define migration parity contract"
```

### Task 2: Move the unapplied Brand admission forward

**Files:**
- Rename: `supabase/migrations/0004_admit_brand_v03.sql` → `supabase/migrations/20260828170000_admit_brand_v03.sql`
- Modify: `supabase/migrations/20260828170000_admit_brand_v03.sql`
- Modify: `tests/migrations.test.mjs`

**Interfaces:**
- Consumes: the observed last applied version `20260820192536` recorded in the approved spec.
- Produces: one pending local migration with version `20260828170000`, later than the last applied version `20260820192536`.

- [ ] **Step 1: Update the existing migration topology test first**

Replace the filename assertions in the first test with:

```js
assert.deepEqual(files, [
  "0001_identity.sql",
  "0002_manifest.sql",
  "0003_autoridade.sql",
  "0004_adk_runtime.sql",
  "0005_adk_runtime_advisors.sql",
  "20260820192536_gadget_lineage.sql",
  "20260828170000_admit_brand_v03.sql",
]);
```

- [ ] **Step 2: Run the focused test and prove the expected filename is absent**

Run: `node --test tests/migrations.test.mjs`

Expected: FAIL showing `0004_admit_brand_v03.sql` where `20260828170000_admit_brand_v03.sql` is expected.

- [ ] **Step 3: Rename the unapplied file**

Run: `git mv supabase/migrations/0004_admit_brand_v03.sql supabase/migrations/20260828170000_admit_brand_v03.sql`

- [ ] **Step 4: Correct only the migration's custody comment**

Replace the comment that says the migration is number `0004` with:

```sql
-- Versao 20260828170000: 0004 ja pertence a adk_runtime no banco vivo.
-- Esta migration ainda nao foi aplicada e por isso avanca sem reescrever historia.
```

Do not change its SQL statements, hashes, artifact states, or source claims in this task.

- [ ] **Step 5: Run the migration topology tests**

Run: `node --test tests/migrations.test.mjs`

Expected: all existing migration topology tests PASS with the new filename.

- [ ] **Step 6: Commit the forward-only repair**

```bash
git add tests/migrations.test.mjs
git add -A -- supabase/migrations
git commit -m "fix: move pending brand admission forward"
```

### Task 3: Record the observed live ledger and expose the parity command

**Files:**
- Create: `supabase/migrations/applied-ledger.json`
- Create: `scripts/check-migration-parity.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `supabase/migrations/applied-ledger.json` and directory entries beside it.
- Produces: command `npm run migrations:check` with stdout `MIGRATION PARITY: PASS · 6 applied · 7 local · 1 pending`.
- Relies on: `checkMigrationParity` from Task 1 and the unique pending version from Task 2.

- [ ] **Step 1: Create the live-ledger receipt exactly as observed**

```json
{
  "project": "powerfarm",
  "observedAt": "2026-08-28",
  "entries": [
    { "version": "0001", "name": "identity", "source": "0001_identity.sql" },
    { "version": "0002", "name": "manifest", "source": "0002_manifest.sql" },
    { "version": "0003", "name": "autoridade", "source": "0003_autoridade.sql" },
    { "version": "0004", "name": "adk_runtime", "source": "0004_adk_runtime.sql" },
    { "version": "0005", "name": "adk_runtime_advisors", "source": "0005_adk_runtime_advisors.sql" },
    { "version": "20260820192536", "name": "gadget_lineage", "source": "20260820192536_gadget_lineage.sql" }
  ]
}
```

- [ ] **Step 2: Write the CLI entrypoint**

```js
import { readFile, readdir } from "node:fs/promises";
import { checkMigrationParity } from "./migration-parity.mjs";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const receipt = JSON.parse(await readFile(new URL("applied-ledger.json", migrationsUrl), "utf8"));
const result = checkMigrationParity({
  ledger: receipt.entries,
  localFiles: await readdir(migrationsUrl),
});

console.log(
  `MIGRATION PARITY: PASS · ${result.applied} applied · ${result.local} local · ${result.pending.length} pending`,
);
for (const file of result.pending) console.log(`pending: ${file}`);
```

- [ ] **Step 3: Add the npm command without changing the existing test command yet**

```json
{
  "scripts": {
    "migrations:check": "node scripts/check-migration-parity.mjs"
  }
}
```

Merge this key into the existing `scripts` object; retain `dev`, `build`, `start`, and `test` unchanged.

- [ ] **Step 4: Run the parity command**

Run: `npm run migrations:check`

Expected:

```text
MIGRATION PARITY: PASS · 6 applied · 7 local · 1 pending
pending: 20260828170000_admit_brand_v03.sql
```

- [ ] **Step 5: Commit the receipt and passing guard**

```bash
git add package.json scripts/check-migration-parity.mjs supabase/migrations/applied-ledger.json
git commit -m "chore: record applied migration ledger"
```

### Task 4: Make migration parity a repository gate

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/quality.yml`

**Interfaces:**
- Produces: `npm test` runs behavioral tests and migration parity; CI runs `npm ci`, `npm test`, and `npm run build`.
- Does not consume: Supabase credentials, service keys, or a database connection.

- [ ] **Step 1: Update the test script**

Set the scripts to:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "migrations:check": "node scripts/check-migration-parity.mjs",
    "test": "node --test tests/*.test.mjs && npm run migrations:check"
  }
}
```

- [ ] **Step 2: Run the full local gate**

Run: `npm test`

Expected: all Node tests PASS, followed by the migration parity PASS receipt.

- [ ] **Step 3: Create the Registry quality workflow**

```yaml
name: registry-quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 4: Validate the workflow syntax and production build locally**

Run: `npm test && npm run build`

Expected: tests and parity PASS; Next.js build exits 0. If build requires public Supabase variables, supply the same non-secret public URL and publishable key used by the existing Vercel project; never place `SUPABASE_SECRET_KEY` in the command or workflow.

- [ ] **Step 5: Commit the repository gate**

```bash
git add package.json package-lock.json .github/workflows/quality.yml
git commit -m "ci: gate registry migration parity"
```

### Task 5: Document the live refresh and push gate

**Files:**
- Create: `docs/operations/supabase-migration-custody.md`

**Interfaces:**
- Consumes: a read-only live migration listing produced by the linked Supabase CLI or SQL editor.
- Produces: one auditable decision: `NO CHANGE`, `UPDATE RECEIPT`, or `STOP — REMOTE SOURCE MISSING`.

- [ ] **Step 1: Write the operator procedure with exact gates**

```markdown
# Supabase migration custody

## Before creating or applying a migration

1. Run `npx supabase@latest migration list --linked` and save the terminal receipt with the task evidence.
2. Compare the remote version and name pairs with `supabase/migrations/applied-ledger.json`.
3. If the remote contains an entry absent from the receipt, locate its exact SQL source before editing any migration.
4. Update `observedAt` and `entries` only after the exact source is committed under `supabase/migrations/`.
5. Run `npm run migrations:check`.
6. Run `npm test && npm run build`.
7. Inspect pending files with `npx supabase@latest db push --linked --dry-run`.
8. A human reviews the dry-run. This procedure does not authorize `db push`.

## Decisions

- `NO CHANGE`: live list, receipt, and sources agree.
- `UPDATE RECEIPT`: live has a migration whose exact source has been recovered and reviewed.
- `STOP — REMOTE SOURCE MISSING`: live has a migration without exact source in Git.
- `STOP — VERSION COLLISION`: two local or remote migrations share a version.

## Forbidden repairs

- Never reset the linked project.
- Never rename or edit an applied migration.
- Never mark an unapplied migration as applied.
- Never use `SUPABASE_SECRET_KEY` to bypass RLS in Registry runtime code.
```

- [ ] **Step 2: Verify documentation and repository state**

Run: `npm test && git diff --check && git status --short`

Expected: all gates PASS and only the operations document is uncommitted.

- [ ] **Step 3: Commit the custody runbook**

```bash
git add docs/operations/supabase-migration-custody.md
git commit -m "docs: add Supabase migration custody gate"
```

## Completion receipt

Run:

```bash
npm test
npm run build
git log --oneline -5
git status --short
```

The subsystem is complete only when:

- all tests and the production build pass;
- parity reports 6 applied, 7 local, and exactly 1 pending migration;
- the only pending migration is `20260828170000_admit_brand_v03.sql`;
- no Supabase push, reset, repair, or table mutation occurred;
- the worktree is clean.
