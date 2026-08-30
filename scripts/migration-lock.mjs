import { readdir } from "node:fs/promises";

export const HISTORY_DIRS = ["history/process-extracted-2026-08-30"];

export async function collectMigrationFiles(supabaseUrl) {
  const found = [];
  for (const location of ["migrations", ...HISTORY_DIRS]) {
    const dir = new URL(`${location}/`, supabaseUrl);
    let names = [];
    try { names = await readdir(dir); } catch { continue; }
    for (const source of names.filter((n) => n.endsWith(".sql")).sort()) {
      found.push({ location, source, url: new URL(source, dir) });
    }
  }
  return found;
}

export function checkMigrationLock({ lock, actual }) {
  const errors = [];
  const sealedKeys = new Set();

  for (const entry of lock.entries) {
    const key = `${entry.location}/${entry.source}`;
    sealedKeys.add(key);
    const found = actual.get(key);
    if (!found) {
      errors.push(`sealed migration is missing: ${key}`);
    } else if (found !== entry.sha256) {
      errors.push(
        `sealed migration changed content: ${key}\n    locked ${entry.sha256}\n    found  ${found}\n` +
        `    An applied migration is history. Add a new forward-only migration instead of editing this file.`,
      );
    }
  }

  if (errors.length) throw new Error(`migration lock failed:\n- ${errors.join("\n- ")}`);

  return {
    sealed: lock.entries.length,
    unsealed: [...actual.keys()].filter((key) => !sealedKeys.has(key)).sort(),
  };
}
