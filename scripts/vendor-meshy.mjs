#!/usr/bin/env node
/**
 * vendor-meshy.mjs — batch asset generation through the Meshy REST API.
 *
 * Meshy is a VENDOR, never a runtime dep: everything generated here is
 * downloaded into the repo (default docs/promo-assets/meshy/) and recorded
 * in manifest.json with task ids + credit costs. The app never calls
 * Meshy at request time.
 *
 * Requires MESHY_API_KEY in .env / .env.local.
 *
 * Usage:
 *   node scripts/vendor-meshy.mjs text-to-image --prompt "..." --out foo.png [--model nano-banana-2-lite] [--aspect 1:1]
 *   node scripts/vendor-meshy.mjs image-to-image --image in.png --prompt "..." --out foo.png [--model nano-banana-2]
 *   node scripts/vendor-meshy.mjs image-to-3d --image in.png --out model.glb [--model meshy-t2.5] [--texture meshy-n1] [--polys 15000] [--pose a-pose]
 *   node scripts/vendor-meshy.mjs text-to-3d --prompt "..." --out model.glb [--model meshy-t2] [--smart] [--polys 4000]
 *   node scripts/vendor-meshy.mjs status --type image-to-3d --id <taskId>
 *
 * Common flags: --id <label> --note "..." --manifest <path> --no-wait --timeout <sec>
 */

import dotenv from "dotenv";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const API_KEY = process.env.MESHY_API_KEY;
if (!API_KEY) {
  console.error("MESHY_API_KEY missing (set in .env / .env.local)");
  process.exit(1);
}

const DEFAULT_MANIFEST = "docs/promo-assets/meshy/manifest.json";
const IMAGE_TYPES = new Set(["text-to-image", "image-to-image"]);
const POLL_MS = 5000;

// ---------- args ----------
const [command, ...rest] = process.argv.slice(2);
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
  }
}

const need = (name) => {
  if (args[name] === undefined) {
    console.error(`missing required flag --${name}`);
    process.exit(1);
  }
  return args[name];
};

// ---------- meshy client ----------
async function meshy(path, options = {}) {
  const res = await fetch(`https://api.meshy.ai${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || `meshy ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const ENDPOINTS = {
  "text-to-image": "/openapi/v1/text-to-image",
  "image-to-image": "/openapi/v1/image-to-image",
  "image-to-3d": "/openapi/v1/image-to-3d",
  "text-to-3d": "/openapi/v2/text-to-3d",
};

function imageFileToDataUrl(file) {
  const ext = file.toLowerCase().endsWith(".png") ? "png"
    : file.toLowerCase().endsWith(".webp") ? "webp" : "jpeg";
  return `data:image/${ext};base64,${readFileSync(file).toString("base64")}`;
}

async function createTask(type) {
  const body = {};
  if (IMAGE_TYPES.has(type)) {
    body.ai_model = args.model || "nano-banana-2-lite";
    body.prompt = need("prompt");
    if (args.aspect) body.aspect_ratio = args.aspect;
    if (args["multi-view"]) body.generate_multi_view = true;
    if (args["remove-bg"]) body.remove_background = true;
    if (args.pose) body.pose_mode = args.pose;
    if (type === "image-to-image") {
      if (args.image) body.reference_image_urls = [imageFileToDataUrl(resolve(args.image))];
      if (args["input-task"]) body.input_task_id = args["input-task"];
      if (!body.reference_image_urls && !body.input_task_id) {
        console.error("image-to-image requires --image <file> or --input-task <id>");
        process.exit(1);
      }
    }
  } else if (type === "image-to-3d") {
    body.ai_model = args.model || "meshy-t2.5";
    if (args.image) body.image_url = imageFileToDataUrl(resolve(args.image));
    if (args["input-task"]) body.input_task_id = args["input-task"];
    if (!body.image_url && !body.input_task_id) {
      console.error("image-to-3d requires --image <file> or --input-task <id>");
      process.exit(1);
    }
    if (args.smart) body.model_type = "smart-topology";
    if (args.polys) body.target_polycount = Number(args.polys);
    if (args.pose) body.pose_mode = args.pose;
    if (args.format) body.target_formats = [args.format];
    if (args.texture === "none") body.should_texture = false;
    else if (args.texture) body.texture_model = args.texture;
  } else if (type === "text-to-3d") {
    body.mode = "preview";
    body.prompt = need("prompt");
    body.ai_model = args.model || (args.smart ? "meshy-t2" : "meshy-6-lite");
    if (args.smart) body.model_type = "smart-topology";
    if (args.polys) body.target_polycount = Number(args.polys);
    if (args.pose) body.pose_mode = args.pose;
    if (args.format) body.target_formats = [args.format];
  }
  const json = await meshy(ENDPOINTS[type], { method: "POST", body: JSON.stringify(body) });
  const taskId = json.result || json.task_id || json.id;
  if (!taskId) throw new Error(`no task id in response: ${JSON.stringify(json).slice(0, 300)}`);
  return taskId;
}

async function pollTask(type, taskId, timeoutSec) {
  const deadline = Date.now() + timeoutSec * 1000;
  const path = `${ENDPOINTS[type]}/${encodeURIComponent(taskId)}`;
  for (;;) {
    const json = await meshy(path);
    const status = String(json.status || "").toUpperCase();
    process.stdout.write(`\r${type} ${taskId.slice(0, 8)}… ${status} ${json.progress ?? ""}%   `);
    if (["SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED", "CANCELED"].includes(status)) {
      process.stdout.write("\n");
      return { status, json };
    }
    if (Date.now() > deadline) {
      process.stdout.write("\n");
      throw new Error(`timeout after ${timeoutSec}s (still ${status})`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

function resultUrls(json, type) {
  if (IMAGE_TYPES.has(type)) {
    const urls = json.image_urls || (json.image_url ? [json.image_url] : []);
    return urls;
  }
  const mu = json.model_urls || json.result?.model_urls || {};
  const out = {};
  for (const [k, v] of Object.entries(mu)) {
    if (typeof v === "string") out[k] = v;
    else if (v?.url) out[k] = v.url;
  }
  return out;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} for ${url.slice(0, 100)}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`saved ${dest}`);
}

function appendManifest(entry) {
  const mp = resolve(args.manifest || DEFAULT_MANIFEST);
  let manifest = { source: "meshy.ai API", assets: [] };
  if (existsSync(mp)) {
    try { manifest = JSON.parse(readFileSync(mp, "utf8")); } catch { /* rewrite */ }
  }
  if (!Array.isArray(manifest.assets)) manifest.assets = [];
  manifest.assets.push({
    id: args.id || entry.file,
    ...entry,
    task_id: entry.task_id,
    credits: entry.credits ?? null,
    note: args.note || entry.note || "",
  });
  manifest.total_credits_spent = (manifest.total_credits_spent || 0) + (entry.credits || 0);
  mkdirSync(dirname(mp), { recursive: true });
  writeFileSync(mp, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest += ${mp}`);
}

// ---------- main ----------
const TYPE = command;
if (TYPE !== "status" && !ENDPOINTS[TYPE]) {
  console.error(`unknown command "${command}" — expected one of: ${Object.keys(ENDPOINTS).join(", ")}, status`);
  process.exit(1);
}

if (TYPE === "status") {
  const type = need("type");
  const id = need("id");
  if (!ENDPOINTS[type]) { console.error(`unknown --type ${type}`); process.exit(1); }
  const { status, json } = await pollTask(type, id, Number(args.timeout) || 300);
  console.log(JSON.stringify({ status, urls: resultUrls(json, type), credits: json.consumed_credits }, null, 2));
  process.exit(status === "SUCCEEDED" ? 0 : 1);
}

const out = args.out ? resolve(args.out) : null;
const taskId = await createTask(TYPE);
console.log(`task ${taskId}`);

if (args["no-wait"]) {
  console.log(`created ${TYPE} task ${taskId} (not waiting). Poll: node scripts/vendor-meshy.mjs status --type ${TYPE} --id ${taskId}`);
  process.exit(0);
}

const { status, json } = await pollTask(TYPE, taskId, Number(args.timeout) || 600);
if (status !== "SUCCEEDED") {
  console.error(`task ${status}`);
  process.exit(1);
}

const urls = resultUrls(json, TYPE);
const credits = json.consumed_credits ?? null;

if (IMAGE_TYPES.has(TYPE)) {
  const list = Array.isArray(urls) ? urls : [urls];
  if (!list.length) { console.error("no image_urls in result"); process.exit(1); }
  const dest = out || resolve(`meshy-output/${TYPE}-${taskId.slice(0, 8)}.png`);
  await download(list[0], dest);
  if (args.manifest !== "none") {
    appendManifest({ file: dest.slice(process.cwd().length + 1), type: TYPE, task_id: taskId, model: args.model || null, credits });
  }
} else {
  const formats = Object.keys(urls);
  if (!formats.length) { console.error("no model_urls in result", JSON.stringify(json).slice(0, 500)); process.exit(1); }
  const want = args.format || formats[0];
  const url = urls[want];
  if (!url) { console.error(`format ${want} not in result; available: ${formats.join(", ")}`); process.exit(1); }
  const dest = out || resolve(`meshy-output/${TYPE}-${taskId.slice(0, 8)}.${want}`);
  await download(url, dest);
  if (args.manifest !== "none") {
    appendManifest({ file: dest.slice(process.cwd().length + 1), type: TYPE, task_id: taskId, model: args.model || null, credits });
  }
}

console.log(`done — ${credits ?? "?"} credits`);
