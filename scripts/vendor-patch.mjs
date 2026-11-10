#!/usr/bin/env node
/**
 * vendor-patch.mjs — batch asset vendoring through the Patch asset library.
 *
 * Patch is a VENDOR, never a runtime dep: everything fetched here is
 * downloaded into the repo and recorded in a manifest.json next to the
 * files. The app never calls patch.gg at request time.
 *
 * No API key needed.
 *
 * Usage:
 *   node scripts/vendor-patch.mjs fetch <asset-id> --variant <name> [--roles role1,role2] --out <dir> [--thumb <px>]
 *   node scripts/vendor-patch.mjs info <asset-id>
 *
 * Asset ids contain ":" and "/" — they're URL-encoded on the wire.
 * --roles filters files inside a variant by their role (e.g. baseColor,normal).
 * --thumb <px> also downloads the thumbnail_levels entry at that width.
 * One manifest.json per --out dir; entries merge on (id, variant).
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const API = "https://patch.gg/api/v1/assets";

// ---------- args ----------
const [command, ...rest] = process.argv.slice(2);
const positional = [];
const args = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  } else {
    positional.push(a);
  }
}

const need = (name) => {
  if (args[name] === undefined) {
    console.error(`missing required flag --${name}`);
    process.exit(1);
  }
  return args[name];
};

// ---------- patch client ----------
async function patchAsset(id) {
  const res = await fetch(`${API}/${encodeURIComponent(id)}`);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || `patch ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function download(url, dest, expectSha256) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} for ${url.slice(0, 100)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (expectSha256) {
    const got = createHash("sha256").update(buf).digest("hex");
    if (got !== expectSha256) {
      throw new Error(`sha256 mismatch for ${dest}: expected ${expectSha256}, got ${got}`);
    }
  }
  writeFileSync(dest, buf);
  console.log(`saved ${dest} (${buf.length} bytes${expectSha256 ? ", sha256 ok" : ""})`);
}

function mergeManifest(dir, entry) {
  const mp = join(dir, "manifest.json");
  let manifest = { source: "patch.gg API", assets: [] };
  if (existsSync(mp)) {
    try { manifest = JSON.parse(readFileSync(mp, "utf8")); } catch { /* rewrite */ }
  }
  if (!Array.isArray(manifest.assets)) manifest.assets = [];
  const idx = manifest.assets.findIndex(
    (a) => a.id === entry.id && a.variant === entry.variant
  );
  if (idx >= 0) manifest.assets[idx] = entry;
  else manifest.assets.push(entry);
  mkdirSync(dirname(mp), { recursive: true });
  writeFileSync(mp, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest += ${mp}`);
}

// ---------- main ----------
const assetId = positional[0];
if (!assetId || !["fetch", "info"].includes(command)) {
  console.error("usage: vendor-patch.mjs fetch <asset-id> --variant <name> [--roles a,b] --out <dir> [--thumb <px>]\n" +
    "       vendor-patch.mjs info <asset-id>");
  process.exit(1);
}

const asset = await patchAsset(assetId);

if (command === "info") {
  console.log(JSON.stringify({
    id: asset.id, title: asset.title, type: asset.type,
    license: asset.license?.spdx, credit: asset.credit,
    variants: (asset.variants || []).map((v) => ({
      name: v.name,
      files: (v.files || []).map((f) => ({ name: f.name, role: f.role, size: f.size })),
    })),
  }, null, 2));
  process.exit(0);
}

// fetch
const variantName = need("variant");
const outDir = resolve(need("out"));
const variant = (asset.variants || []).find((v) => v.name === variantName);
if (!variant) {
  console.error(`variant "${variantName}" not on ${asset.id}; available: ${(asset.variants || []).map((v) => v.name).join(", ")}`);
  process.exit(1);
}

const roles = args.roles ? String(args.roles).split(",").map((s) => s.trim()).filter(Boolean) : null;
let files = variant.files || [];
if (roles) {
  files = files.filter((f) => roles.includes(f.role));
  if (!files.length) {
    console.error(`no files in variant "${variantName}" match roles ${roles.join(",")}`);
    process.exit(1);
  }
}

const saved = [];
for (const f of files) {
  const dest = join(outDir, f.name);
  await download(f.url, dest, f.sha256);
  saved.push({ name: f.name, sha256: f.sha256, size: f.size });
}

if (args.thumb) {
  const px = Number(args.thumb);
  const level = (asset.thumbnail_levels || []).find((l) => l.width === px);
  if (!level) {
    console.error(`no thumbnail level ${px}px; available: ${(asset.thumbnail_levels || []).map((l) => l.width).join(", ")}`);
  } else {
    const name = level.url.split("/").pop();
    await download(level.url, join(outDir, name), null);
  }
}

mergeManifest(outDir, {
  id: asset.id,
  title: asset.title,
  source: asset.source || null,
  license: asset.license?.spdx || null,
  credit: asset.credit || null,
  variant: variantName,
  files: saved,
  fetched_at: new Date().toISOString(),
});

console.log(`done — ${saved.length} file(s) from ${asset.id}@${variantName}`);
