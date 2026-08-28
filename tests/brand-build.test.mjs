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
  assert.match(css, /\.pf-brand-symbol-master/);
  assert.match(css, /powerfarm-symbol-master\.svg/);
  assert.match(css, /\.pf-brand-symbol-cream/);
  assert.match(css, /\.pf-brand-symbol-black/);
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
