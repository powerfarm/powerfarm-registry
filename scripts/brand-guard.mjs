import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const SOURCE_ROOTS = ["app", "apps", "lib", "packages", "public", "ui"];
const TEXT_EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs", ".json", ".ts", ".tsx", ".svg"]);
const ASSET_EXTENSIONS = new Set([".svg", ".woff", ".woff2", ".ttf", ".otf"]);
const GENERATED_DIRECTORIES = new Set([".next", "coverage", "dist", "node_modules"]);

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && GENERATED_DIRECTORIES.has(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child);
  }
  return files;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasCopiedFontFamily(source, family) {
  const name = escaped(family);
  const context = "(?:font-family\\s*:[^;\\n]*|fontFamily\\s*[:=][^,;\\n]*|[\\\"'`])";
  return new RegExp(`${context}${name}\\b`, "i").test(source);
}

export async function checkBrandRepository({ root = process.cwd() } = {}) {
  const colorFile = join(root, "brand/color/powerfarm-color-tokens.json");
  const typeFile = join(root, "brand/typography/powerfarm-typography-tokens.json");
  const colors = JSON.parse(await readFile(colorFile, "utf8"));
  const typography = JSON.parse(await readFile(typeFile, "utf8"));
  const colorLiterals = [...new Set([
    ...Object.values(colors.colors).map((entry) => entry.hex),
    ...colors.tint_ramp.stops.map((entry) => entry.hex),
  ])];
  const fontFamilies = [...new Set(Object.values(typography.families).map((entry) => entry.primary))];

  const canonicalAssetFiles = (await Promise.all([
    walk(join(root, "brand/.generated/logo")),
    walk(join(root, "brand/logo")),
    walk(join(root, "brand/iconography/svg")),
    walk(join(root, "brand/graphic-elements/svg")),
    walk(join(root, "brand/patterns/svg")),
    walk(join(root, "brand/patterns/svg-cream")),
    walk(join(root, "brand/typography/fonts")),
  ])).flat().filter((file) => ASSET_EXTENSIONS.has(extname(file).toLowerCase()));
  const canonicalAssets = new Map();
  for (const file of canonicalAssetFiles) canonicalAssets.set(sha256(await readFile(file)), file);

  const scanned = (await Promise.all(SOURCE_ROOTS.map((path) => walk(join(root, path))))).flat();
  const violations = [];
  for (const file of scanned) {
    const extension = extname(file).toLowerCase();
    const bytes = await readFile(file);
    const name = relative(root, file);

    if (canonicalAssets.has(sha256(bytes))) violations.push(`${name}: copied canonical asset`);
    if (!TEXT_EXTENSIONS.has(extension)) continue;

    const source = bytes.toString("utf8");
    for (const literal of colorLiterals) {
      if (new RegExp(escaped(literal), "i").test(source)) {
        violations.push(`${name}: copied brand literal ${literal}`);
      }
    }
    for (const family of fontFamilies) {
      if (hasCopiedFontFamily(source, family)) {
        violations.push(`${name}: copied brand font family ${family}`);
      }
    }
    if (/(?:\bfrom\s*|(?:@?import)\s*)["'][^"']*(?:\.\.\/)+brand\//.test(source)) {
      violations.push(`${name}: relative import into brand internals`);
    }
  }

  if (violations.length) {
    throw new Error(`brand guard failed:\n- ${[...new Set(violations)].sort().join("\n- ")}`);
  }
  return {
    scannedFiles: scanned.length,
    canonicalValues: colorLiterals.length + fontFamilies.length,
    canonicalAssets: canonicalAssets.size,
  };
}
