# Canonical Brand Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admit the Powerfarm v0.5.1 brand into the Registry repository as one canonical workspace package, generate consumable CSS and logo assets from its sources, migrate the live Registry to imports, and reject copied brand values or files in CI.

**Architecture:** `brand/` is the only authored visual authority. `@powerfarm/brand` compiles JSON tokens and logo geometry into ignored `.generated/` outputs; `@powerfarm/ui-core` maps those brand variables to semantic interface roles without restating values. The existing root Next.js Registry remains in place during this plan and consumes both packages through npm workspaces.

**Tech Stack:** Node.js 22 in CI and 24 on Vercel, npm workspaces, Node test runner, ES modules, Python 3 for the existing deterministic logo generator, Next.js 15, React 19, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-08-28-integrated-superstructure-passwordless-identity-design.md`

## Global Constraints

- The brand system version is exactly `0.5.1`.
- The only token authorities are the `brand/**/*-tokens.json` files.
- The symbol authority is `brand/logo/geometria.py`; the wordmark path authority is `brand/logo/_wordmark-limpo.path` with provenance in `brand/logo/SOURCE-STATUS.md`.
- Generated CSS and generated logo variants live only in `brand/.generated/` and are not committed.
- Fonts and their OFL licenses remain only under `brand/typography/`.
- Apps import package exports; they do not use relative paths into `brand/` or copy files into `public/`.
- `@powerfarm/ui-core` may define semantic aliases with `var(...)`; it may not contain brand hex values, font family declarations, logos, icons, fonts, or copied source JSON.
- Existing Supabase migrations and the live Vercel project are untouched by this plan.
- All work stays on `codex/powerfarm-v0.1` and uses small commits after a passing task.

---

## Planned File Structure

```text
brand/
├── package.json                         workspace package and public exports
├── .gitignore                           ignores .generated only
├── brand-lock.json                      committed source/output receipt
├── MASTER-README.md                     v0.5.1 source documentation
├── POWERFARM-Brand-Manual-v0.5.1.md    manual source
├── CHANGELOG-v0.3.md
├── CHANGELOG-v0.4.md
├── CHANGELOG-v0.5.md
├── CHANGELOG-v0.5.1.md
├── color/powerfarm-color-tokens.json
├── typography/
│   ├── powerfarm-typography-tokens.json
│   ├── fonts/*.woff2
│   └── licenses/*.txt
├── layout/powerfarm-layout-tokens.json
├── iconography/
│   ├── powerfarm-iconography-tokens.json
│   └── svg/*.svg
├── graphic-elements/
│   ├── powerfarm-graphic-elements-tokens.json
│   └── svg/*.svg
├── patterns/
│   ├── powerfarm-pattern-tokens.json
│   ├── svg/*.svg
│   └── svg-cream/*.svg
├── imagery/*
├── applications/powerfarm-application-tokens.json
└── logo/
    ├── geometria.py
    ├── gerar.py
    ├── _wordmark-limpo.path
    ├── SOURCE-STATUS.md
    └── reconstrucao/*

packages/ui-core/
├── package.json
└── src/
    ├── index.css
    ├── semantic.css
    └── base.css

scripts/
├── brand-model.mjs                     load, compile, hash and verify canonical sources
├── build-brand.mjs                     write deterministic .generated outputs
├── brand-guard.mjs                     detect copied values and assets
└── check-brand.mjs                     production CLI used by CI

tests/
├── brand-source.test.mjs
├── brand-build.test.mjs
└── brand-guard.test.mjs
```

The original local directory `/Users/ubl-ops/POWERFARM-Superstructure-v0.1.0` remains unchanged as custody evidence.

---

### Task 1: Admit only canonical brand sources

**Files:**
- Create: `brand/package.json`
- Create: `brand/.gitignore`
- Create: the source paths listed under `brand/` in the file structure above
- Modify: `package.json`
- Test: `tests/brand-source.test.mjs`

**Interfaces:**
- Consumes: `/Users/ubl-ops/POWERFARM-Superstructure-v0.1.0/brand` as read-only import source.
- Produces: workspace `@powerfarm/brand@0.5.1` and canonical source tree used by every later task.

- [ ] **Step 1: Write the failing source-custody test**

```js
// tests/brand-source.test.mjs
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../brand/", import.meta.url);

test("brand package exposes the admitted v0.5.1 source", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@powerfarm/brand");
  assert.equal(pkg.version, "0.5.1");

  for (const path of [
    "color/powerfarm-color-tokens.json",
    "typography/powerfarm-typography-tokens.json",
    "layout/powerfarm-layout-tokens.json",
    "logo/geometria.py",
    "logo/_wordmark-limpo.path",
    "logo/SOURCE-STATUS.md",
    "typography/fonts/anton-latin-400-normal.woff2",
    "typography/fonts/inter-latin-400-normal.woff2",
    "typography/fonts/inter-latin-600-normal.woff2",
    "typography/licenses/Anton-OFL.txt",
    "typography/licenses/Inter-OFL.txt",
  ]) await access(new URL(path, root));
});

test("generated brand output is excluded from source control", async () => {
  const ignore = await readFile(new URL(".gitignore", root), "utf8");
  assert.match(ignore, /^\.generated\/$/m);
});
```

- [ ] **Step 2: Run the custody test and verify it fails**

Run: `node --test tests/brand-source.test.mjs`

Expected: FAIL with `ENOENT` for `brand/package.json`.

- [ ] **Step 3: Import the exact source allowlist from the preserved directory**

Create `brand/`, copy the manuals, changelogs, token JSON, source SVG collections,
font/license files, imagery sources, and logo source/reconstruction files listed
above. Do not import `__pycache__`, `.DS_Store`, PDFs, boards, generated CSS,
generated logo variants, `dist/`, or application render outputs.

Use the preserved directory as source and verify it remains clean by comparing
its pre/post tree hash. The copy operation is mechanical; no source file is
rewritten during admission.

- [ ] **Step 4: Add the brand workspace manifest**

```json
{
  "name": "@powerfarm/brand",
  "version": "0.5.1",
  "private": true,
  "type": "module",
  "files": [".generated", "brand-lock.json", "**/*-tokens.json", "typography/fonts", "typography/licenses"],
  "exports": {
    "./css": "./.generated/index.css",
    "./logo/*": "./.generated/logo/*.svg",
    "./fonts/*": "./typography/fonts/*",
    "./tokens/color": "./color/powerfarm-color-tokens.json",
    "./tokens/typography": "./typography/powerfarm-typography-tokens.json",
    "./tokens/layout": "./layout/powerfarm-layout-tokens.json",
    "./tokens/iconography": "./iconography/powerfarm-iconography-tokens.json",
    "./tokens/graphic-elements": "./graphic-elements/powerfarm-graphic-elements-tokens.json",
    "./tokens/patterns": "./patterns/powerfarm-pattern-tokens.json",
    "./tokens/imagery": "./imagery/powerfarm-imagery-tokens.json",
    "./tokens/applications": "./applications/powerfarm-application-tokens.json"
  }
}
```

`brand/.gitignore` contains exactly:

```gitignore
.generated/
```

Add root workspace membership without moving the existing Next app:

```json
"workspaces": ["brand", "packages/*", "apps/*"]
```

- [ ] **Step 5: Install workspace links and run the custody test**

Run: `npm install`

Run: `node --test tests/brand-source.test.mjs`

Expected: both tests PASS and `npm ls @powerfarm/brand` resolves the local workspace.

- [ ] **Step 6: Commit the admitted source**

```bash
git add package.json package-lock.json brand tests/brand-source.test.mjs
git commit -m "feat: admit canonical Powerfarm brand source"
```

---

### Task 2: Compile deterministic CSS, logos, and a provenance lock

**Files:**
- Create: `scripts/brand-model.mjs`
- Create: `scripts/build-brand.mjs`
- Create: `tests/brand-build.test.mjs`
- Modify: `package.json`
- Modify: `brand/package.json`

**Interfaces:**
- Consumes: `brand/**/*-tokens.json`, `brand/logo/geometria.py`, and `brand/logo/_wordmark-limpo.path`.
- Produces: `loadBrandModel()`, `compileBrandCss(model)`, `canonicalBrandFiles()`, `hashFile(url)`, and `buildBrand({ writeLock })`; generated files under `brand/.generated/` plus committed `brand/brand-lock.json`.

- [ ] **Step 1: Write failing compiler tests**

```js
// tests/brand-build.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildBrand, compileBrandCss, loadBrandModel } from "../scripts/brand-model.mjs";

test("compiler derives CSS from v0.5.1 JSON tokens", async () => {
  const css = compileBrandCss(await loadBrandModel());
  assert.match(css, /--pf-powerfarm-black: #080702;/);
  assert.match(css, /--pf-powerfarm-cream: #F8DFC1;/);
  assert.match(css, /--pf-energy-amber: #FFB02E;/);
  assert.match(css, /--pf-space-2xs: 4px;/);
  assert.match(css, /--pf-type-h1: 40px;/);
  assert.match(css, /--pf-font-display: "Anton", "Arial Narrow", Impact, sans-serif;/);
});

test("build verifies deterministic outputs against the committed lock", async () => {
  await buildBrand({ writeLock: true });
  const first = await readFile(new URL("../brand/brand-lock.json", import.meta.url), "utf8");
  await buildBrand();
  const second = await readFile(new URL("../brand/brand-lock.json", import.meta.url), "utf8");
  assert.equal(second, first);
  const lock = JSON.parse(first);
  assert.equal(lock.brandSystemVersion, "0.5.1");
  assert.match(lock.sources["color/powerfarm-color-tokens.json"], /^[0-9a-f]{64}$/);
  assert.match(lock.outputs["index.css"], /^[0-9a-f]{64}$/);
  assert.match(lock.outputs["logo/powerfarm-horizontal-cream.svg"], /^[0-9a-f]{64}$/);
});
```

- [ ] **Step 2: Run the compiler tests and verify they fail**

Run: `node --test tests/brand-build.test.mjs`

Expected: FAIL because `scripts/brand-model.mjs` does not exist.

- [ ] **Step 3: Implement the brand model and compiler**

`scripts/brand-model.mjs` must:

1. load color, typography and layout JSON using URLs relative to the module;
2. validate `brand === "POWERFARM"` and `version === "0.5.1"` for each;
3. emit variables in stable, sorted order;
4. render color names from `colors[*].hex`, tint names from
   `tint_ramp.stops[*].token`, typography scale/line-height/tracking/families,
   and layout spacing/grid values;
5. generate `@font-face` rules whose URLs resolve through the brand package;
6. hash bytes with `createHash("sha256")`;
7. invoke the preserved Python logo generator inside an isolated temporary
   directory containing copies of only `geometria.py`, `gerar.py`, and
   `_wordmark-limpo.path`, so the committed source tree is not mutated;
8. write `.generated/index.css` and `.generated/logo/*.svg` atomically;
9. compare the computed receipt to committed `brand/brand-lock.json` unless
   `writeLock` is true; only the explicit lock command may update that file.

Export these exact signatures: `loadBrandModel()`, `compileBrandCss(model)`,
`canonicalBrandFiles()`, `hashFile(fileUrl)`, and
`buildBrand({ writeLock = false } = {})`.

The lock shape is fixed:

```json
{
  "brand": "POWERFARM",
  "brandSystemVersion": "0.5.1",
  "sources": { "relative/source/path": "sha256" },
  "outputs": { "relative/output/path": "sha256" }
}
```

Sort both maps by relative path before `JSON.stringify(lock, null, 2)` and add
one trailing newline. A mismatch throws `brand lock mismatch; run npm run brand:lock after an intentional canonical change`.

- [ ] **Step 4: Add the build CLI and scripts**

```js
// scripts/build-brand.mjs
import { buildBrand } from "./brand-model.mjs";

const writeLock = process.argv.includes("--write-lock");
const result = await buildBrand({ writeLock });
console.log(`BRAND BUILD: PASS · ${result.sources} sources · ${result.outputs} outputs`);
```

Add to root `package.json`:

```json
"brand:build": "node scripts/build-brand.mjs",
"brand:lock": "node scripts/build-brand.mjs --write-lock",
"prebuild": "npm run brand:build"
```

Add to `brand/package.json`:

```json
"scripts": { "build": "node ../scripts/build-brand.mjs" }
```

- [ ] **Step 5: Prove deterministic generation**

Run once for the admitted version: `npm run brand:lock`

Run: `npm run brand:build`

Run: `node --test tests/brand-build.test.mjs`

Run: `git status --short brand/.generated brand/brand-lock.json`

Expected: tests PASS, Git reports no `.generated` files, and only the initial
`brand/brand-lock.json` receipt is tracked.

- [ ] **Step 6: Commit the compiler**

```bash
git add package.json package-lock.json brand/package.json brand/brand-lock.json scripts/brand-model.mjs scripts/build-brand.mjs tests/brand-build.test.mjs
git commit -m "feat: compile brand artifacts from canonical sources"
```

---

### Task 3: Create semantic UI Core without copied brand values

**Files:**
- Create: `packages/ui-core/package.json`
- Create: `packages/ui-core/src/index.css`
- Create: `packages/ui-core/src/semantic.css`
- Create: `packages/ui-core/src/base.css`
- Create: `tests/ui-core.test.mjs`

**Interfaces:**
- Consumes: `@powerfarm/brand/css` and the `--pf-*` primitive variables generated by Task 2.
- Produces: `@powerfarm/ui-core/index.css`, semantic variables such as `--pf-surface-canvas`, and base element behavior.

- [ ] **Step 1: Write the failing UI Core contract test**

```js
// tests/ui-core.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = new URL("../packages/ui-core/src/", import.meta.url);

test("ui-core imports brand and contains aliases, not brand literals", async () => {
  const index = await readFile(new URL("index.css", source), "utf8");
  const semantic = await readFile(new URL("semantic.css", source), "utf8");
  assert.match(index, /@import "@powerfarm\/brand\/css";/);
  assert.match(semantic, /--pf-surface-canvas: var\(--pf-powerfarm-black\);/);
  assert.match(semantic, /--pf-action-primary-bg: var\(--pf-energy-amber\);/);
  assert.doesNotMatch(index + semantic, /#[0-9a-f]{3,8}/i);
  assert.doesNotMatch(index + semantic, /font-family:\s*["']?(Anton|Inter)/i);
});
```

- [ ] **Step 2: Run the UI Core test and verify it fails**

Run: `node --test tests/ui-core.test.mjs`

Expected: FAIL with `ENOENT` for `packages/ui-core/src/index.css`.

- [ ] **Step 3: Create the workspace package**

```json
{
  "name": "@powerfarm/ui-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": { "@powerfarm/brand": "0.5.1" },
  "exports": { "./index.css": "./src/index.css" }
}
```

`src/index.css` contains only imports:

```css
@import "@powerfarm/brand/css";
@import "./semantic.css";
@import "./base.css";
```

`semantic.css` defines the approved dark/light role maps from the spec using
only `var(--pf-...)` references. Interface-only values use one named variable,
including control heights, border widths, zero radii, motion durations and
focus/shadow behavior. No consumer is allowed to restate them.

The dark role map contains these exact aliases:

```css
:root, .pf-theme-dark {
  --pf-surface-canvas: var(--pf-powerfarm-black);
  --pf-surface-panel: var(--pf-graphite);
  --pf-surface-raised: var(--pf-tint-10);
  --pf-surface-input: var(--pf-tint-05);
  --pf-text-primary: var(--pf-powerfarm-cream);
  --pf-text-secondary: var(--pf-tint-65);
  --pf-text-inverse: var(--pf-powerfarm-black);
  --pf-border: var(--pf-tint-25);
  --pf-border-strong: var(--pf-tint-40);
  --pf-action-primary-bg: var(--pf-energy-amber);
  --pf-action-primary-fg: var(--pf-powerfarm-black);
  --pf-action-secondary-bg: var(--pf-tint-15);
  --pf-action-secondary-fg: var(--pf-powerfarm-cream);
  --pf-accent-text: var(--pf-energy-amber);
  --pf-focus: var(--pf-energy-amber);
  --pf-signal-critical: var(--pf-powerfarm-cream);
  --pf-signal-warning: var(--pf-energy-amber);
  --pf-signal-info: var(--pf-tint-65);
  --pf-signal-success: var(--pf-powerfarm-cream);
}
```

The light map uses black on cream/white surfaces and `--pf-amber-deep` for
accent text and focus, exactly as required by the v0.5.1 contrast rules.

`base.css` defines box sizing, body defaults, inherited form typography,
focus-visible, selection and reduced-motion behavior using only primitive or
semantic variables.

- [ ] **Step 4: Link the package and run tests**

Run: `npm install`

Run: `node --test tests/ui-core.test.mjs`

Expected: PASS and `npm ls @powerfarm/ui-core` resolves the workspace package.

- [ ] **Step 5: Commit UI Core**

```bash
git add package.json package-lock.json packages/ui-core tests/ui-core.test.mjs
git commit -m "feat: add semantic Powerfarm UI core"
```

---

### Task 4: Migrate the Registry to canonical package imports

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Delete: `app/brand.css`
- Delete: `app/brand-colors.json`
- Delete: `public/symbol.svg`
- Delete: `public/wordmark.svg`
- Create: `tests/registry-brand-consumer.test.mjs`

**Interfaces:**
- Consumes: `@powerfarm/ui-core/index.css`, including the generated `.pf-brand-wordmark-horizontal-cream` asset class.
- Produces: existing Registry routes rendered from canonical brand exports with no runtime font request and no local brand copy.

- [ ] **Step 1: Write the failing consumer test**

```js
// tests/registry-brand-consumer.test.mjs
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("Registry consumes canonical brand package exports", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@import "@powerfarm\/ui-core\/index\.css";/);
  assert.match(layout, /pf-brand-wordmark-horizontal-cream/);
  assert.doesNotMatch(layout, /next\/font\/google|\/wordmark\.svg/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}/i);
});

test("legacy Registry brand copies are gone", async () => {
  for (const path of ["../app/brand.css", "../app/brand-colors.json", "../public/symbol.svg", "../public/wordmark.svg"]) {
    await assert.rejects(access(new URL(path, import.meta.url)));
  }
});
```

- [ ] **Step 2: Run the consumer test and verify it fails**

Run: `node --test tests/registry-brand-consumer.test.mjs`

Expected: FAIL because the Registry still imports `app/brand.css`, `next/font/google`, and `/wordmark.svg`.

- [ ] **Step 3: Replace local brand loading with package imports**

At the top of `app/globals.css`, replace `@import "./brand.css"` with:

```css
@import "@powerfarm/ui-core/index.css";
```

Replace every Registry-specific raw visual value with a semantic or primitive
token. Status colors not present in the current brand are mapped to semantic
signal roles rather than inventing green/red literals. Component geometry uses
the spacing, control, border and radius variables from UI Core.

The generated brand CSS owns the logo URL and exposes
`.pf-brand-wordmark-horizontal-cream`. In `app/layout.tsx`, remove
`next/font/google` and render the canonical asset class without a local file:

```tsx
import "./globals.css";

// ...
<span className="marca pf-brand-wordmark-horizontal-cream" role="img" aria-label="Powerfarm" />
```

- [ ] **Step 4: Remove the four legacy copies**

Delete only after the canonical imports compile:

```text
app/brand.css
app/brand-colors.json
public/symbol.svg
public/wordmark.svg
```

- [ ] **Step 5: Verify tests and production build**

Run: `npm run brand:build`

Run: `node --test tests/registry-brand-consumer.test.mjs tests/ui-core.test.mjs`

Run: `npm run build`

Expected: all tests PASS, Next build PASS, and no request to Google Fonts appears during build.

- [ ] **Step 6: Commit the Registry migration**

```bash
git add app public tests/registry-brand-consumer.test.mjs
git commit -m "refactor: consume canonical brand in Registry"
```

---

### Task 5: Enforce non-duplication in tests and CI

**Files:**
- Create: `scripts/brand-guard.mjs`
- Create: `scripts/check-brand.mjs`
- Create: `tests/brand-guard.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`

**Interfaces:**
- Consumes: canonical token values and SHA-256 asset hashes from `@powerfarm/brand`.
- Produces: `checkBrandRepository({ root, allowGenerated })`, CLI `npm run brand:check`, and CI evidence.

- [ ] **Step 1: Write failing guard tests with isolated fixtures**

```js
// tests/brand-guard.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkBrandRepository } from "../scripts/brand-guard.mjs";

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), "powerfarm-brand-guard-"));
  const canonical = {
    "brand/color/powerfarm-color-tokens.json": JSON.stringify({
      colors: { black: { hex: "#080702" } },
      tint_ramp: { stops: [] },
    }),
    "brand/typography/powerfarm-typography-tokens.json": JSON.stringify({
      families: { display: { primary: "Anton" }, text: { primary: "Inter" } },
    }),
  };
  for (const [path, body] of Object.entries({ ...canonical, ...files })) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), body);
  }
  return root;
}

test("guard rejects a copied canonical color outside brand", async () => {
  const root = await fixture({
    "app/copied.css": ".copy { color: #080702; }",
  });
  await assert.rejects(checkBrandRepository({ root }), /app\/copied\.css.*#080702/);
});

test("guard accepts semantic var references", async () => {
  const root = await fixture({
    "packages/ui-core/semantic.css": ":root { --surface: var(--pf-powerfarm-black); }",
  });
  await assert.doesNotReject(checkBrandRepository({ root }));
});
```

Add separate fixture tests that reject:

- `font-family: "Anton"` outside generated brand CSS;
- a byte-identical canonical SVG copied under `public/`;
- a byte-identical WOFF2 copied under another package;
- `../../brand/` relative imports from an app.

- [ ] **Step 2: Run guard tests and verify they fail**

Run: `node --test tests/brand-guard.test.mjs`

Expected: FAIL because `scripts/brand-guard.mjs` does not exist.

- [ ] **Step 3: Implement the repository guard**

Implement `scripts/brand-guard.mjs` with this exact public behavior:

```js
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const SOURCE_ROOTS = ["app", "apps", "lib", "packages", "public", "ui"];
const TEXT_EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs", ".json", ".ts", ".tsx", ".svg"]);
const ASSET_EXTENSIONS = new Set([".svg", ".woff", ".woff2", ".ttf", ".otf"]);

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child);
  }
  return files;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function checkBrandRepository({ root = process.cwd() } = {}) {
  const colorFile = join(root, "brand/color/powerfarm-color-tokens.json");
  const typeFile = join(root, "brand/typography/powerfarm-typography-tokens.json");
  const colors = JSON.parse(await readFile(colorFile, "utf8"));
  const typography = JSON.parse(await readFile(typeFile, "utf8"));
  const literals = [
    ...Object.values(colors.colors).map((entry) => entry.hex),
    ...colors.tint_ramp.stops.map((entry) => entry.hex),
    typography.families.display.primary,
    typography.families.text.primary,
  ];

  const canonicalAssetFiles = (await Promise.all([
    walk(join(root, "brand/.generated/logo")),
    walk(join(root, "brand/logo")),
    walk(join(root, "brand/iconography/svg")),
    walk(join(root, "brand/graphic-elements/svg")),
    walk(join(root, "brand/typography/fonts")),
  ])).flat().filter((file) => ASSET_EXTENSIONS.has(extname(file).toLowerCase()));
  const canonicalAssets = new Map();
  for (const file of canonicalAssetFiles) canonicalAssets.set(sha256(await readFile(file)), file);

  const scanned = (await Promise.all(SOURCE_ROOTS.map((path) => walk(join(root, path))))).flat();
  const violations = [];
  for (const file of scanned) {
    const extension = extname(file).toLowerCase();
    const bytes = await readFile(file);
    const name = relative(root, file);
    if (canonicalAssets.has(sha256(bytes))) violations.push(`${name}: copied canonical asset`);
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const source = bytes.toString("utf8");
    for (const literal of literals) {
      if (new RegExp(escaped(literal), "i").test(source)) violations.push(`${name}: copied brand literal ${literal}`);
    }
    if (/(?:from|import\s*)["'][^"']*(?:\.\.\/)+brand\//.test(source)) {
      violations.push(`${name}: relative import into brand internals`);
    }
  }
  if (violations.length) throw new Error(`brand guard failed:\n- ${[...new Set(violations)].sort().join("\n- ")}`);
  return { scannedFiles: scanned.length, canonicalValues: literals.length, canonicalAssets: canonicalAssets.size };
}
```

During implementation, keep this behavior but factor helpers only when a test
requires direct access. The production scan intentionally excludes `brand/`,
docs and tests, while fixtures call the same exported function against their
isolated roots.

- [ ] **Step 4: Add the production check CLI**

```js
// scripts/check-brand.mjs
import { buildBrand } from "./brand-model.mjs";
import { checkBrandRepository } from "./brand-guard.mjs";

await buildBrand();
const result = await checkBrandRepository();
console.log(`BRAND GUARD: PASS · ${result.scannedFiles} files · ${result.canonicalAssets} assets`);
```

Update root scripts:

```json
"brand:check": "node scripts/check-brand.mjs",
"test": "node --test tests/*.test.mjs && npm run migrations:check && npm run brand:check"
```

The existing CI already runs `npm test` followed by `npm run build`; no new
secret or service is added. Add a comment to `.github/workflows/quality.yml`
that brand generation and non-duplication are covered by `npm test`.

- [ ] **Step 5: Run all gates**

Run: `npm test`

Expected: all Node tests PASS, migration parity PASS, brand guard PASS.

Run: `npm run build`

Expected: Next production build PASS after deterministic brand generation.

Run: `git status --short`

Expected: only the intended Task 5 source changes; no `.generated` output.

- [ ] **Step 6: Commit the guard**

```bash
git add package.json package-lock.json scripts/brand-guard.mjs scripts/check-brand.mjs tests/brand-guard.test.mjs .github/workflows/quality.yml
git commit -m "ci: prevent duplicate Powerfarm brand sources"
```

---

## Plan 1 Completion Gate

Before starting the Identity UI plan, verify all of the following in one clean
checkout:

```bash
npm ci
npm test
npm run build
git status --short
```

Required result:

- install, tests and build pass;
- generated brand files are reproducible and untracked;
- the Registry renders from `@powerfarm/brand` and `@powerfarm/ui-core`;
- no old brand CSS, JSON, logo or font copy remains in the Registry;
- a deliberate copied hex or SVG makes `brand:check` fail;
- no Supabase, Vercel domain, DNS or production setting has changed.

The next independent plan will implement `@powerfarm/identity-ui` and the
`apps/identity` preview host against this foundation. OAuth cutover remains a
later plan because it mutates live configuration and requires its own rollback
gate.
