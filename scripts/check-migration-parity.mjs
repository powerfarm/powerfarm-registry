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
