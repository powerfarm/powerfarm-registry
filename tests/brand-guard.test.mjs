import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkBrandRepository } from "../scripts/brand-guard.mjs";

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), "powerfarm-brand-guard-"));
  const canonical = {
    "brand/color/powerfarm-color-tokens.json": JSON.stringify({
      colors: { black: { hex: "#080702" } },
      tint_ramp: { stops: [] },
    }),
    "brand/typography/powerfarm-typography-tokens.json": JSON.stringify({
      families: { display: { primary: "Anton" }, text: { primary: "Inter" } },
    }),
  };
  for (const [path, body] of Object.entries({ ...canonical, ...files })) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), body);
  }
  return root;
}

test("guard rejects a copied canonical color outside brand", async () => {
  const root = await fixture({
    "app/copied.css": ".copy { color: #080702; }",
  });
  await assert.rejects(checkBrandRepository({ root }), /app\/copied\.css.*#080702/);
});

test("guard accepts semantic var references and unrelated words", async () => {
  const root = await fixture({
    "packages/ui-core/semantic.css": ":root { --surface: var(--pf-powerfarm-black); }",
    "app/types.ts": "export interface PointerState { active: boolean }",
  });
  await assert.doesNotReject(checkBrandRepository({ root }));
});

test("guard rejects a copied canonical font family", async () => {
  const root = await fixture({
    "app/copied.css": ".copy { font-family: \"Anton\"; }",
  });
  await assert.rejects(checkBrandRepository({ root }), /app\/copied\.css.*Anton/);
});

test("guard rejects a byte-identical canonical SVG", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
  const root = await fixture({
    "brand/iconography/svg/master.svg": svg,
    "public/copied.svg": svg,
  });
  await assert.rejects(checkBrandRepository({ root }), /public\/copied\.svg: copied canonical asset/);
});

test("guard rejects a byte-identical canonical font file", async () => {
  const font = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01]);
  const root = await fixture({
    "brand/typography/fonts/inter.woff2": font,
    "packages/example/inter.woff2": font,
  });
  await assert.rejects(checkBrandRepository({ root }), /packages\/example\/inter\.woff2: copied canonical asset/);
});

test("guard rejects relative imports into brand internals", async () => {
  const root = await fixture({
    "apps/example/source.ts": 'import colors from "../../brand/color/powerfarm-color-tokens.json";',
  });
  await assert.rejects(checkBrandRepository({ root }), /apps\/example\/source\.ts: relative import into brand internals/);
});
