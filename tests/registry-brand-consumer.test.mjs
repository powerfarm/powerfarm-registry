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
