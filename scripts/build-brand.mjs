import { buildBrand } from "./brand-model.mjs";

const writeLock = process.argv.includes("--write-lock");
const result = await buildBrand({ writeLock });
console.log(`BRAND BUILD: PASS · ${result.sources} sources · ${result.outputs} outputs`);
