import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandRoot = join(repositoryRoot, "brand");
const generatedRoot = join(brandRoot, ".generated");
const lockPath = join(brandRoot, "brand-lock.json");
const expectedBrand = "POWERFARM";
const expectedVersion = "0.5.1";

const tokenPaths = {
  color: "color/powerfarm-color-tokens.json",
  typography: "typography/powerfarm-typography-tokens.json",
  layout: "layout/powerfarm-layout-tokens.json",
};

function sortedEntries(record) {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right));
}

function cssName(value) {
  return value.replaceAll("_", "-");
}

function fontFamily(family) {
  return [family.primary, ...family.fallback]
    .map((name) => name.includes(" ") || /^[A-Z]/.test(name) && name !== "Impact" ? `"${name}"` : name)
    .join(", ");
}

function assertCanonicalDocument(document, path) {
  if (document.brand !== expectedBrand || document.version !== expectedVersion) {
    throw new Error(`${path} must declare ${expectedBrand} brand version ${expectedVersion}`);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(brandRoot, relativePath), "utf8"));
}

export async function loadBrandModel() {
  const [color, typography, layout] = await Promise.all([
    readJson(tokenPaths.color),
    readJson(tokenPaths.typography),
    readJson(tokenPaths.layout),
  ]);

  for (const [name, document] of Object.entries({ color, typography, layout })) {
    assertCanonicalDocument(document, tokenPaths[name]);
  }

  return { color, typography, layout };
}

function compileFontFaces() {
  return `@font-face {
  font-family: "Anton";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../typography/fonts/anton-latin-400-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../typography/fonts/inter-latin-400-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("../typography/fonts/inter-latin-600-normal.woff2") format("woff2");
}`;
}

function compileLogoClasses() {
  return `.pf-brand-logo {
  display: inline-block;
  background-position: left center;
  background-repeat: no-repeat;
  background-size: contain;
}

.pf-brand-wordmark-horizontal-cream {
  background-image: url("./logo/powerfarm-horizontal-cream.svg");
}

.pf-brand-wordmark-horizontal-black {
  background-image: url("./logo/powerfarm-horizontal-black.svg");
}

.pf-brand-symbol-master {
  background-image: url("./logo/powerfarm-symbol-master.svg");
}

.pf-brand-symbol-cream {
  background-image: url("./logo/powerfarm-symbol-cream.svg");
}

.pf-brand-symbol-black {
  background-image: url("./logo/powerfarm-symbol-black.svg");
}`;
}

export function compileBrandCss({ color, typography, layout }) {
  const variables = [];

  for (const [name, value] of sortedEntries(color.colors)) {
    variables.push([`--pf-${cssName(name)}`, value.hex]);
  }
  for (const stop of [...color.tint_ramp.stops].sort((left, right) => left.token.localeCompare(right.token))) {
    variables.push([stop.token, stop.hex]);
  }
  for (const [name, value] of sortedEntries(typography.scale_px)) {
    variables.push([`--pf-type-${cssName(name)}`, `${value}px`]);
  }
  for (const [name, value] of sortedEntries(typography.line_height)) {
    variables.push([`--pf-line-height-${cssName(name)}`, String(value)]);
  }
  for (const [name, value] of sortedEntries(typography.tracking)) {
    variables.push([`--pf-tracking-${cssName(name)}`, value]);
  }
  for (const [name, value] of sortedEntries(typography.families)) {
    variables.push([`--pf-font-${cssName(name)}`, fontFamily(value)]);
  }
  for (const [name, value] of sortedEntries(layout.spacing_px)) {
    variables.push([`--pf-space-${cssName(name)}`, `${value}px`]);
  }
  for (const [viewport, settings] of sortedEntries(layout.grid)) {
    for (const [name, value] of sortedEntries(settings)) {
      const unit = name === "columns" ? "" : "px";
      variables.push([`--pf-grid-${cssName(viewport)}-${cssName(name)}`, `${value}${unit}`]);
    }
  }

  variables.sort(([left], [right]) => left.localeCompare(right));
  const declarations = variables.map(([name, value]) => `  ${name}: ${value};`).join("\n");

  return `${compileFontFaces()}

:root {
${declarations}
}

${compileLogoClasses()}
`;
}

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = join(path, entry.name);
    const name = relative(brandRoot, child);
    if (entry.isDirectory()) {
      if (name === ".generated") continue;
      files.push(...await walk(child));
      continue;
    }
    if ([".gitignore", "brand-lock.json", "package.json"].includes(name)) continue;
    files.push(pathToFileURL(child));
  }
  return files;
}

export async function canonicalBrandFiles() {
  return walk(brandRoot);
}

export async function hashFile(fileUrl) {
  return createHash("sha256").update(await readFile(fileUrl)).digest("hex");
}

async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  await writeFile(temporaryPath, bytes);
  await rename(temporaryPath, path);
}

async function generateLogos() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "powerfarm-brand-"));
  const temporaryLogo = join(temporaryRoot, "logo");
  await mkdir(temporaryLogo);

  try {
    for (const name of ["geometria.py", "gerar.py", "_wordmark-limpo.path"]) {
      await cp(join(brandRoot, "logo", name), join(temporaryLogo, name));
    }
    await execFileAsync("python3", [join(temporaryLogo, "gerar.py")], { cwd: temporaryRoot });

    const names = (await readdir(temporaryLogo))
      .filter((name) => name.endsWith(".svg"))
      .sort((left, right) => left.localeCompare(right));
    return new Map(await Promise.all(names.map(async (name) => [name, await readFile(join(temporaryLogo, name))])));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function stableLock(lock) {
  return {
    brand: lock.brand,
    brandSystemVersion: lock.brandSystemVersion,
    sources: Object.fromEntries(sortedEntries(lock.sources)),
    outputs: Object.fromEntries(sortedEntries(lock.outputs)),
  };
}

export async function buildBrand({ writeLock = false } = {}) {
  const css = compileBrandCss(await loadBrandModel());
  const logos = await generateLogos();
  const outputs = new Map([["index.css", Buffer.from(css)]]);
  for (const [name, bytes] of logos) outputs.set(`logo/${name}`, bytes);

  for (const [name, bytes] of outputs) {
    await atomicWrite(join(generatedRoot, name), bytes);
  }

  const sourceFiles = await canonicalBrandFiles();
  const sourceHashes = {};
  for (const file of sourceFiles) {
    sourceHashes[relative(brandRoot, fileURLToPath(file))] = await hashFile(file);
  }

  const outputHashes = {};
  for (const [name, bytes] of outputs) {
    outputHashes[name] = createHash("sha256").update(bytes).digest("hex");
  }

  const lock = stableLock({
    brand: expectedBrand,
    brandSystemVersion: expectedVersion,
    sources: sourceHashes,
    outputs: outputHashes,
  });
  const serialized = `${JSON.stringify(lock, null, 2)}\n`;

  if (writeLock) {
    await atomicWrite(lockPath, serialized);
  } else {
    const committed = await readFile(lockPath, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    if (committed !== serialized) {
      throw new Error("brand lock mismatch; run npm run brand:lock after an intentional canonical change");
    }
  }

  return { sources: sourceFiles.length, outputs: outputs.size };
}
