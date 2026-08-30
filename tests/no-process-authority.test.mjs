import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (/\.(?:ts|tsx|mjs|js)$/.test(entry.name)) out.push(path);
  }
  return out;
}

test("Registry application code does not read or mint Process authority", async () => {
  const roots = [new URL("../app/", import.meta.url), new URL("../lib/", import.meta.url)];
  const files = (await Promise.all(roots.map((u) => walk(u.pathname)))).flat();
  const text = (await Promise.all(files.map((f) => readFile(f, "utf8")))).join("\n");
  for (const forbidden of [
    /\.from\(["']grants["']\)/,
    /\.from\(["']runs["']\)/,
    /\.from\(["']run_grants["']\)/,
    /has_registry_grant/,
    /powerfarm_issue_run_grant/,
  ]) assert.doesNotMatch(text, forbidden);
});
