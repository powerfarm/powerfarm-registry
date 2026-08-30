import { readFile, readdir } from "node:fs/promises";
import { checkMigrationParity } from "./migration-parity.mjs";
import { HISTORY_DIRS } from "./migration-lock.mjs";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const receipt = JSON.parse(await readFile(new URL("applied-ledger.json", migrationsUrl), "utf8"));
const extraFiles = {};
for (const location of HISTORY_DIRS) {
  try {
    extraFiles[location] = await readdir(new URL(`../supabase/${location}/`, import.meta.url));
  } catch { extraFiles[location] = []; }
}
const result = checkMigrationParity({
  ledger: receipt.entries,
  localFiles: await readdir(migrationsUrl),
  extraFiles,
});

console.log(
  `MIGRATION PARITY: PASS · ${result.applied} applied · ${result.local} local · ${result.pending.length} pending`,
);
for (const file of result.pending) console.log(`pending: ${file}`);
