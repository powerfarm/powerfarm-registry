// A published migration is history. Its bytes are immutable.
//
// Supabase records that a version ran; it does not record what that version
// said. This lock closes that gap: once a migration enters migration-lock.json
// its content is frozen, and a correction must arrive as a new forward-only
// migration rather than as an edit to the old file.
//
// PowerFarm already protects the lineage of Cards. This protects the lineage
// of the database that carries them.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { checkMigrationLock, collectMigrationFiles } from "./migration-lock.mjs";

const supabase = new URL("../supabase/", import.meta.url);
const lock = JSON.parse(await readFile(new URL("migrations/migration-lock.json", supabase), "utf8"));
const digest = (buf) => createHash("sha256").update(buf).digest("hex");

const present = await collectMigrationFiles(supabase);
const actual = new Map();
for (const { location, source, url } of present) {
  actual.set(`${location}/${source}`, digest(await readFile(url)));
}

const result = checkMigrationLock({ lock, actual });
console.log(`MIGRATION LOCK: PASS · ${result.sealed} sealed · ${result.unsealed.length} not yet sealed`);
for (const file of result.unsealed) console.log(`unsealed: ${file}`);
