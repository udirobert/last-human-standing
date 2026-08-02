#!/usr/bin/env node
/**
 * generate-exhibition-photos.mjs — curated photo pools for the exhibition agents.
 *
 * Generates N candidates per persona for a given game day via fal.ai, into
 * exhibition/photos/day<N>/candidates/. A HUMAN REVIEWS the candidates (difficulty
 * calibration is the whole point) and copies the winner to
 * exhibition/photos/day<N>/<username>.jpg, which the runner picks up.
 *
 * Requires FAL_KEY (fal.ai), read from .env.local or the environment.
 *
 * Usage:
 *   node scripts/generate-exhibition-photos.mjs --day 1
 *   node scripts/generate-exhibition-photos.mjs --day 1 --username blot.exe --count 3
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f);
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error("FAL_KEY required (.env.local or env)"); process.exit(1); }

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const DAY = Number(arg("day", "1"));
const ONLY = arg("username", null);
const COUNT = Number(arg("count", "2"));

// Day themes mirror the rounds table. Extend as days are curated.
const THEMES = {
  1: "AT A CAFÉ",
  2: "AT A PARK",
  3: "WITH A FRIEND",
  4: "AT A BOOKSTORE",
  5: "OUTSIDE AT SUNRISE",
};
const SCENE = {
  1: {
    subject: "café table with a flat white on a saucer, pastry crumbs, casual first-person perspective",
    setting: "small independent café interior, window light",
  },
  2: {
    subject: "hand touching grass next to a park bench, first-person perspective",
    setting: "public park, daytime",
  },
  3: {
    subject: "two coffee cups and two phones on a table, one person's forearm visible, candid hangout photo",
    setting: "casual indoor table",
  },
  4: {
    subject: "person holding an open paperback in a bookstore aisle, first-person over-shoulder perspective",
    setting: "independent bookstore",
  },
  5: {
    subject: "hand raised toward a low sunrise sun, first-person perspective, cold morning air",
    setting: "outdoors at dawn, rooftops or hills on the horizon",
  },
};

// Per-persona model + style: visibly different difficulty ON PURPOSE.
const PERSONA_GEN = {
  "aria_fieldnotes": {
    model: "fal-ai/flux-realism",
    style: (s) => `amateur iPhone photo, ${s.subject}, ${s.setting}, natural imperfect framing, slight motion blur, muted true-to-life colors, no text, no watermark, mundane everyday snapshot`,
  },
  "blot.exe": {
    model: "fal-ai/flux/schnell",
    style: (s) => `hyper glossy 3d render, ${s.subject}, ${s.setting}, cinematic studio lighting, over-saturated, airbrushed perfection, stock image aesthetic, glowing highlights, a menu board with gibberish text in the background`,
  },
  "claude_ennui": {
    model: "fal-ai/flux/dev",
    style: (s) => `35mm film photo, ${s.subject}, ${s.setting}, quiet composed framing, soft overcast light, subtle grain, slightly faded, tasteful but a little too composed`,
  },
  "duct_tape": {
    model: "fal-ai/fast-sdxl",
    style: (s) => `${s.subject}, ${s.setting}, daylight, snapshot composition`,
  },
};

async function gen(model, prompt) {
  const r = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_size: "landscape_4_3", num_images: 1, enable_safety_checker: false }),
  });
  if (!r.ok) throw new Error(`${model} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const json = await r.json();
  const url = json.images?.[0]?.url;
  if (!url) throw new Error(`${model}: no image url in response`);
  const img = await fetch(url);
  if (!img.ok) throw new Error(`download failed: ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}

const scene = SCENE[DAY];
if (!scene) { console.error(`no scene defined for day ${DAY}`); process.exit(1); }
const outDir = join(ROOT, "exhibition", "photos", `day${DAY}`, "candidates");
mkdirSync(outDir, { recursive: true });

const personas = JSON.parse(readFileSync(join(ROOT, "exhibition", "personas.json"), "utf8")).personas
  .filter((p) => !ONLY || p.username === ONLY);

for (const p of personas) {
  const genSpec = PERSONA_GEN[p.username];
  if (!genSpec) { console.log(`no generator config for ${p.username} — skip`); continue; }
  const prompt = genSpec.style(scene);
  for (let i = 1; i <= COUNT; i += 1) {
    try {
      console.log(`[${p.username}] ${genSpec.model} #${i} …`);
      const buf = await gen(genSpec.model, prompt);
      const file = join(outDir, `${p.username}-${i}.jpg`);
      writeFileSync(file, buf);
      console.log(`  → ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`  FAIL ${p.username} #${i}: ${e.message}`);
    }
  }
}
console.log(`\nReview candidates in ${outDir}, then copy winners to ../<username>.jpg and scp day${DAY}/ to snel-bot:/opt/last-human-standing/shared/exhibition-photos/`);
