#!/usr/bin/env node
/* NIGHT SHIFT — painted asset smoke check.
 *
 * Verifies the shipped art set against the committed manifest:
 *   1. every manifest asset exists on disk as WebP
 *   2. every asset is within the size budget (250KB)
 *   3. no stray files in game-off/art/ that the manifest doesn't know
 *   4. every filer portrait the audit card can request exists
 *   5. every card vignette the game can render exists (riddles.js + cold-vale)
 *
 * Run: node scripts/smoke-art.mjs   (exit 0 = pass)
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ART = resolve(ROOT, "game-off", "art");
const BUDGET = 250 * 1024;

const { MANIFEST } = await import("./art-manifest.mjs");
// riddles.js is a browser script — load it on a fake window like test-logic.mjs
globalThis.window = {};
new Function("window", "module",
  readFileSync(resolve(ROOT, "game-off", "riddles.js"), "utf8"))(globalThis.window, { exports: {} });
const { CARDS } = globalThis.window.NIGHT_SHIFT_DATA;

let fail = 0;
const bad = (msg) => { fail++; console.error("  ✗ " + msg); };

console.log("NIGHT SHIFT art smoke");
console.log(`  manifest entries: ${MANIFEST.length}`);

// 1 + 2: presence and budget
for (const e of MANIFEST) {
  const p = resolve(ART, `${e.id}.webp`);
  if (!existsSync(p)) { bad(`${e.id}.webp missing`); continue; }
  const kb = statSync(p).size;
  if (kb > BUDGET) bad(`${e.id}.webp ${(kb / 1024).toFixed(0)}KB over budget (250KB)`);
}

// 3: strays
const known = new Set(MANIFEST.map((e) => `${e.id}.webp`));
for (const f of readdirSync(ART)) {
  if (!known.has(f) && !f.startsWith(".")) bad(`stray file in game-off/art/: ${f}`);
}

// 4: filer portraits the night audit can request
for (const filer of ["mara", "oko", "jun", "tess", "vale"]) {
  if (!existsSync(resolve(ART, `${filer}.webp`))) bad(`filer portrait ${filer}.webp missing`);
}

// 5: card vignettes the game can render (audit cases draw sub.card.id)
for (const id of [...CARDS.map((c) => c.id), "cold-vale"]) {
  if (!existsSync(resolve(ART, `card-${id}.webp`))) bad(`card vignette card-${id}.webp missing`);
}

// total weight
let total = 0;
for (const e of MANIFEST) {
  const p = resolve(ART, `${e.id}.webp`);
  if (existsSync(p)) total += statSync(p).size;
}
console.log(`  total painted weight: ${(total / 1024).toFixed(0)}KB across ${MANIFEST.length} assets`);

console.log(fail ? `FAIL — ${fail} problem${fail > 1 ? "s" : ""}` : "PASS — art set complete and in budget");
process.exit(fail ? 1 : 0);
