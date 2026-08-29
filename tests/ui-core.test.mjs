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
