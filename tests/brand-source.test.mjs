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
