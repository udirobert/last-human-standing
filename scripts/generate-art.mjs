#!/usr/bin/env node
/* NIGHT SHIFT — painted key-art generator (MiniMax H3 via fal.ai).
 *
 * Reads the manifest in art-manifest.mjs, submits each asset to
 * minimax/h3-image (text-to-image or edit with earlier assets as
 * reference images), and writes WebP files to game-off/art/.
 *
 *   node scripts/generate-art.mjs              # the anchor group
 *   node scripts/generate-art.mjs vale dawn     # named assets
 *   node scripts/generate-art.mjs --group cards # one group
 *   node scripts/generate-art.mjs --all         # everything, in order
 *
 * FAL_KEY comes from the environment or .env.local. Reference images
 * are passed as base64 data URIs, so nothing is uploaded anywhere.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "game-off", "art");
const QUEUE = "https://queue.fal.run";
const T2I = "minimax/h3-image/text-to-image";
const EDIT = "minimax/h3-image/edit";
const SIZE_BUDGET = 250 * 1024; // per-asset budget before recompression

const { MANIFEST, GROUPS } = await import("./art-manifest.mjs");

function falKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  for (const f of [".env.local", ".env"]) {
    try {
      const m = readFileSync(resolve(ROOT, f), "utf8").match(/^FAL_KEY=(.*)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch { /* next */ }
  }
  throw new Error("FAL_KEY not found in env or .env.local");
}

const outPath = (id) => resolve(OUT_DIR, `${id}.webp`);

function dataUri(id) {
  const p = outPath(id);
  if (!existsSync(p)) throw new Error(`reference asset "${id}" has not been generated yet`);
  return `data:image/webp;base64,${readFileSync(p).toString("base64")}`;
}

async function runModel(endpoint, input) {
  const key = falKey();
  const submit = await fetch(`${QUEUE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`submit ${submit.status}: ${(await submit.text()).slice(0, 400)}`);
  const { status_url, response_url } = await submit.json();
  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 2500));
    const st = await fetch(status_url, { headers: { Authorization: `Key ${key}` } });
    const j = await st.json();
    if (j.status === "COMPLETED") break;
    if (j.status === "IN_QUEUE" || j.status === "IN_PROGRESS") {
      if (Date.now() - t0 > 240_000) throw new Error(`timeout on ${endpoint}`);
      continue;
    }
    throw new Error(`queue status ${j.status}: ${JSON.stringify(j).slice(0, 400)}`);
  }
  const out = await (await fetch(response_url, { headers: { Authorization: `Key ${key}` } })).json();
  const img = out.images?.[0];
  if (!img?.url) throw new Error(`no image in response: ${JSON.stringify(out).slice(0, 300)}`);
  return img;
}

/* the model's WebP can be chunky — re-encode down to the budget */
function recompress(id) {
  const p = outPath(id);
  const before = readFileSync(p).length;
  if (before <= SIZE_BUDGET) return before;
  const tmp = resolve(OUT_DIR, `.${id}.tmp.webp`);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", p,
    "-c:v", "libwebp", "-quality", "72", tmp]);
  if (r.status !== 0 || !existsSync(tmp)) {
    try { existsSync(tmp) && unlinkSync(tmp); } catch { /* */ }
    console.warn(`  ! ffmpeg recompress failed for ${id} (${r.stderr?.toString().slice(0, 120)})`);
    return before;
  }
  writeFileSync(p, readFileSync(tmp));
  try { unlinkSync(tmp); } catch { /* */ }
  return readFileSync(p).length;
}

async function generate(entry) {
  const [w, h] = entry.size;
  let input, endpoint;
  if (entry.kind === "edit") {
    endpoint = EDIT;
    input = {
      prompt: entry.prompt,
      image_urls: entry.refs.map(dataUri),
      image_size: { width: w, height: h },
      num_images: 1,
      output_format: "webp",
    };
  } else {
    endpoint = T2I;
    input = {
      prompt: entry.prompt,
      image_size: { width: w, height: h },
      num_images: 1,
      output_format: "webp",
      enable_prompt_expansion: false,
    };
  }
  const img = await runModel(endpoint, input);
  const buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
  writeFileSync(outPath(entry.id), buf);
  const size = recompress(entry.id);
  console.log(`  ✓ ${entry.id} — ${img.width}x${img.height}, ${(size / 1024).toFixed(0)} KB`);
}

function select(args) {
  if (args.includes("--all")) return MANIFEST;
  const groups = args.filter((a) => a.startsWith("--group=")).map((a) => a.slice(8).split(",")).flat();
  const ids = args.filter((a) => !a.startsWith("--"));
  if (groups.length || ids.length) {
    const wanted = new Set([
      ...ids,
      ...groups.flatMap((g) => GROUPS[g] ?? []),
    ]);
    return MANIFEST.filter((e) => wanted.has(e.id));
  }
  return MANIFEST.filter((e) => GROUPS.anchor.includes(e.id));
}

const args = process.argv.slice(2);
mkdirSync(OUT_DIR, { recursive: true });
const todo = select(args).filter((e) => e.kind !== "vendor");
console.log(`NIGHT SHIFT art — generating ${todo.length} asset${todo.length === 1 ? "" : "s"} → game-off/art/`);
const t0 = Date.now();
let failed = 0;
for (const entry of todo) {
  try {
    await generate(entry);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${entry.id}: ${e.message}`);
  }
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s` +
  (failed ? ` — ${failed} FAILED, rerun the missing ids` : " — all ok"));
process.exit(failed ? 1 : 0);
