function duplicates(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([item]) => item);
}

function sourceName(source) {
  return /^(?:\d+)_(.*)\.sql$/.exec(source)?.[1] ?? "";
}

export function migrationVersion(file) {
  return /^(\d+)_.*\.sql$/.exec(file)?.[1] ?? null;
}

export function checkMigrationParity({ ledger, localFiles, extraFiles = {} }) {
  const errors = [];
  const sqlFiles = localFiles.filter((file) => migrationVersion(file)).sort();
  const localByVersion = new Map();

  for (const file of sqlFiles) {
    const version = migrationVersion(file);
    localByVersion.set(version, [...(localByVersion.get(version) ?? []), file]);
  }

  for (const version of duplicates(ledger.map((entry) => entry.version))) {
    errors.push(`duplicate ledger version ${version}`);
  }
  for (const [version, files] of localByVersion) {
    if (files.length > 1) errors.push(`duplicate local version ${version}: ${files.join(", ")}`);
  }
  for (const entry of ledger) {
    const location = entry.location ?? "migrations";
    const known = location === "migrations" ? sqlFiles : (extraFiles[location] ?? []);
    if (!known.includes(entry.source)) errors.push(`missing applied source ${location === "migrations" ? "" : location + "/"}${entry.source}`);
    if (migrationVersion(entry.source) !== entry.version) {
      errors.push(`ledger version ${entry.version} does not match source ${entry.source}`);
    }
    const name = sourceName(entry.source);
    if (name !== entry.name) errors.push(`ledger name ${entry.name} does not match source name ${name}`);
  }

  if (errors.length) throw new Error(`migration parity failed:\n- ${errors.join("\n- ")}`);

  const appliedSources = new Set(
    ledger.filter((entry) => (entry.location ?? "migrations") === "migrations").map((entry) => entry.source),
  );
  return {
    applied: ledger.length,
    local: sqlFiles.length,
    pending: sqlFiles.filter((file) => !appliedSources.has(file)).sort(),
  };
}
