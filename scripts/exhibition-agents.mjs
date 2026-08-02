#!/usr/bin/env node
/**
 * exhibition-agents.mjs — drives the Cohort 1 exhibition agents.
 *
 * Each run is one pass over the agent keyfile: any agent whose day round is
 * open, whose jittered submission time has arrived, and who hasn't checked
 * in yet goes through the REAL client flow — SIWE sign-in, signed photo
 * upload, /api/checkin, /api/checkin/location. No backdoors: agents are
 * subject to the same caps, gates (via the is_agent bypass), and jury.
 *
 * Idempotent and stateless: safe to run every few minutes from cron/pm2.
 * An agent without a curated photo for the day skips it and dies at close —
 * that is acceptable, published drama ("the machine missed a day").
 *
 * Usage (on the prod host, from the release dir):
 *   node scripts/exhibition-agents.mjs
 * pm2 cron example:
 *   pm2 start scripts/exhibition-agents.mjs --name lhs-exhibition-agents \
 *     --cron "*\/10 * * * *" --no-autorestart
 *
 * Env:
 *   LHS_AGENTS_FILE  keyfile from seed-exhibition-agents.mjs
 *                    (default /opt/last-human-standing/shared/exhibition-agents.json)
 *   LHS_API_BASE     default https://lasthumanstanding.thisyearnofear.com
 *   LHS_PHOTOS_DIR   default <repo>/exhibition/photos
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL +
 *   VITE_SUPABASE_ANON_KEY are read from the host shared/.env when present.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { createClient } from "@supabase/supabase-js";
import { constructSiweMessage } from "../server/lib/siweMessage.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST_ENV = "/opt/last-human-standing/shared/.env";
if (existsSync(HOST_ENV)) {
  for (const line of readFileSync(HOST_ENV, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const AGENTS_FILE = process.env.LHS_AGENTS_FILE || "/opt/last-human-standing/shared/exhibition-agents.json";
const API_BASE = (process.env.LHS_API_BASE || "https://lasthumanstanding.thisyearnofear.com").replace(/\/$/, "");
const PHOTOS_DIR = process.env.LHS_PHOTOS_DIR || join(ROOT, "exhibition", "photos");
const DOMAIN = new URL(API_BASE).host;

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

/** Deterministic per-agent-per-day submission offset: 5–45 min after open. */
function jitterMinutes(address, day) {
  const h = createHash("sha256").update(`${address}:${day}:exhibition-jitter`).digest();
  return 5 + (h[0] / 255) * 40;
}

function jitterOffsetM(address, day, maxM) {
  const h = createHash("sha256").update(`${address}:${day}:exhibition-geo`).digest();
  const dx = ((h[1] / 255) * 2 - 1) * (maxM / 111_320);
  const dy = ((h[2] / 255) * 2 - 1) * (maxM / 111_320);
  return [dy, dx]; // [dlat, dlng-ish]
}

const CAPTIONS = {
  "aria_fieldnotes": (t, d) => [`${t.toLowerCase()}, day ${d}. the light was kind.`, `day ${d}. same stool, ${t.toLowerCase()}.`, `${t.toLowerCase()} — quieter than usual for a day ${d}.`],
  "blot.exe": (t, d) => [`${t} vibes!!! day ${d} let's GOOO 🔥`, `omg day ${d} at ${t}!! #LastHuman #Day${d}`, `${t}!!! you already know. day ${d}.`],
  "claude_ennui": (t, d) => [`${t.toLowerCase()}, as always. day ${d} of the routine.`, `the usual spot obliges: ${t.toLowerCase()}. day ${d}.`, `day ${d}. ${t.toLowerCase()}. ritual intact.`],
  "duct_tape": (t, d) => [`${t}. day ${d}. done.`, `day ${d} — ${t.toLowerCase()}.`, `${t.toLowerCase()} / ${d}`],
};

async function authedAgentSession(account) {
  const nonceResp = await fetch(`${API_BASE}/api/nonce`, { method: "POST" });
  if (!nonceResp.ok) throw new Error(`nonce failed: ${nonceResp.status}`);
  const { nonce } = await nonceResp.json();
  const statement = "Sign in to Last Human Standing";
  const message = constructSiweMessage({
    domain: DOMAIN,
    address: account.address,
    statement,
    uri: API_BASE,
    nonce,
    chainId: 480, // World Chain — same as human World App users
  });
  const signature = await account.signMessage({ message });
  const verifyResp = await fetch(`${API_BASE}/api/complete-siwe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: { status: "success", message, signature, address: account.address, version: 1 }, nonce, statement }),
  });
  if (!verifyResp.ok) throw new Error(`siwe failed: ${verifyResp.status} ${await verifyResp.text()}`);
  const setCookie = verifyResp.headers.get("set-cookie") || "";
  return setCookie.split(";")[0];
}

async function api(cookie, path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

function photoForDay(username, day) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const p = join(PHOTOS_DIR, `day${day}`, `${username}.${ext}`);
    if (existsSync(p)) return { path: p, ext };
  }
  return null;
}

async function main() {
  if (!existsSync(AGENTS_FILE)) {
    log(`no keyfile at ${AGENTS_FILE} — nothing to do`);
    return;
  }
  const { agents } = JSON.parse(readFileSync(AGENTS_FILE, "utf8"));
  const personas = JSON.parse(readFileSync(join(ROOT, "exhibition", "personas.json"), "utf8")).personas;

  for (const agent of agents || []) {
    const persona = personas.find((p) => p.username === agent.username);
    if (!persona) { log(`no persona for ${agent.username} — skipping`); continue; }
    const account = privateKeyToAccount(agent.privateKey);

    try {
      const cookie = await authedAgentSession(account);
      const { body: state } = await api(cookie, "/api/game/state");
      if (state?.phase !== "live" || !state?.round) { log(`${agent.username}: phase=${state?.phase ?? "?"} — idle`); continue; }
      const { round } = state;
      if (state.you?.checkedInToday) { log(`${agent.username}: already checked in day ${round.day}`); continue; }
      const now = Date.now();
      const opens = Date.parse(round.opensAt);
      const closes = Date.parse(round.closesAt);
      const dueAt = opens + jitterMinutes(account.address, round.day) * 60_000;
      if (now < dueAt) { log(`${agent.username}: day ${round.day} not due until ${new Date(dueAt).toISOString()}`); continue; }
      if (now > closes) { log(`${agent.username}: day ${round.day} already closed — missed`); continue; }

      // Photo (curated ahead of time; missing photo = missed day).
      const photo = photoForDay(agent.username, round.day);
      let mediaPath = null;
      if (photo) {
        const bytes = readFileSync(photo.path);
        const contentType = photo.ext === "png" ? "image/png" : photo.ext === "webp" ? "image/webp" : "image/jpeg";
        const up = await api(cookie, "/api/upload-url", {
          method: "POST",
          body: JSON.stringify({ fileName: `${agent.username}-day${round.day}.${photo.ext}`, contentType }),
        });
        if (up.status !== 200 || !up.body?.ok) throw new Error(`upload-url failed: ${JSON.stringify(up.body)}`);
        const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
        const { error: upErr } = await supabase.storage
          .from(up.body.bucket)
          .uploadToSignedUrl(up.body.path, up.body.token, new Blob([bytes], { type: contentType }));
        if (upErr) throw new Error(`photo upload failed: ${upErr.message}`);
        mediaPath = up.body.path;
      } else {
        log(`${agent.username}: NO PHOTO for day ${round.day} (expected ${PHOTOS_DIR}/day${round.day}/${agent.username}.jpg) — submitting text-only, high risk`);
      }

      const [dlat, dlng] = jitterOffsetM(account.address, round.day, persona.region.jitterM);
      const lat = persona.region.lat + dlat;
      const lng = persona.region.lng + dlng;
      const theme = round.name || `Day ${round.day}`;
      const captionPick = (CAPTIONS[agent.username] || CAPTIONS.duct_tape)(round.placeType || theme, round.day);
      const h = createHash("sha256").update(`${account.address}:${round.day}:caption`).digest();
      const caption = captionPick[h[3] % captionPick.length];

      const message = [
        "Last Human Standing — Check-in",
        `day=${round.day}`,
        `theme=${theme}`,
        `lat=${lat}`,
        `lng=${lng}`,
        `ts=${new Date().toISOString()}`,
      ].join("\n");
      const signature = await account.signMessage({ message });

      const checkin = await api(cookie, "/api/checkin", {
        method: "POST",
        body: JSON.stringify({
          day: round.day, theme, caption, message, signature,
          address: account.address, username: persona.displayName,
          mediaPath, isInfiltrator: false,
        }),
      });
      log(`${agent.username}: /api/checkin → ${checkin.status} ${checkin.status !== 200 ? JSON.stringify(checkin.body) : ""}`);

      const geo = await api(cookie, "/api/checkin/location", {
        method: "POST",
        body: JSON.stringify({ lat, lng, accuracy: 8 + Math.round((Math.abs(dlat) + Math.abs(dlng)) * 1000) }),
      });
      log(`${agent.username}: /api/checkin/location → ${geo.status} ${geo.status !== 200 ? JSON.stringify(geo.body) : "rank=" + (geo.body?.rank ?? "?")}`);
    } catch (e) {
      log(`${agent.username}: ERROR ${e.message}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
