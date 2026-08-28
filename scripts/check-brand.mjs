import { buildBrand } from "./brand-model.mjs";
import { checkBrandRepository } from "./brand-guard.mjs";

await buildBrand();
const result = await checkBrandRepository();
console.log(`BRAND GUARD: PASS · ${result.scannedFiles} files · ${result.canonicalAssets} assets`);
