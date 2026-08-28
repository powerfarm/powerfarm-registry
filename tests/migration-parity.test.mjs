import assert from "node:assert/strict";
import test from "node:test";
import { checkMigrationParity, migrationVersion } from "../scripts/migration-parity.mjs";

const ledger = [
  { version: "0001", name: "identity", source: "0001_identity.sql" },
  { version: "0002", name: "manifest", source: "0002_manifest.sql" },
];

test("extracts the numeric migration version", () => {
  assert.equal(migrationVersion("0001_identity.sql"), "0001");
  assert.equal(migrationVersion("20260828170000_admit_brand_v03.sql"), "20260828170000");
  assert.equal(migrationVersion("README.md"), null);
});

test("accepts exact applied sources plus a unique forward migration", () => {
  assert.deepEqual(checkMigrationParity({
    ledger,
    localFiles: [
      "0001_identity.sql",
      "0002_manifest.sql",
      "20260828170000_admit_brand_v03.sql",
    ],
  }), {
    applied: 2,
    local: 3,
    pending: ["20260828170000_admit_brand_v03.sql"],
  });
});

test("rejects an applied migration without its exact source", () => {
  assert.throws(
    () => checkMigrationParity({ ledger, localFiles: ["0001_identity.sql"] }),
    /missing applied source 0002_manifest\.sql/,
  );
});

test("rejects two local files with the same version", () => {
  assert.throws(
    () => checkMigrationParity({
      ledger,
      localFiles: ["0001_identity.sql", "0002_manifest.sql", "0002_other.sql"],
    }),
    /duplicate local version 0002: 0002_manifest\.sql, 0002_other\.sql/,
  );
});

test("rejects a ledger name that does not match its source filename", () => {
  assert.throws(
    () => checkMigrationParity({
      ledger: [{ version: "0001", name: "wrong", source: "0001_identity.sql" }],
      localFiles: ["0001_identity.sql"],
    }),
    /ledger name wrong does not match source name identity/,
  );
});

test("rejects duplicate versions in the committed ledger", () => {
  assert.throws(
    () => checkMigrationParity({
      ledger: [
        { version: "0001", name: "identity", source: "0001_identity.sql" },
        { version: "0001", name: "other", source: "0001_other.sql" },
      ],
      localFiles: ["0001_identity.sql", "0001_other.sql"],
    }),
    /duplicate ledger version 0001/,
  );
});
