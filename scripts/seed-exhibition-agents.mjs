#!/usr/bin/env node
/**
 * seed-exhibition-agents.mjs — create the Cohort 1 exhibition agents.
 *
 * Generates one keypair per persona in exhibition/personas.json, inserts
 * them as is_agent users admitted to cohort 1, and writes the PRIVATE KEYS
 * to a keyfile that never enters the repo:
 *   default: /opt/last-human-standing/shared/exhibition-agents.json (chmod 600)
 *
 * Run ON THE PROD HOST (reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * from /opt/last-human-standing/shared/.env when present), or anywhere with
 * those two env vars set.
 *
 * Idempotent: existing usernames keep their existing key/address from the
 * keyfile (or are skipped if the user exists but the keyfile is lost —
 * then that persona needs a fresh username).
 *
 * Usage:
 *   node scripts/seed-exhibition-agents.mjs [--keyfile PATH] [--cohort 1] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const KEYFILE = arg("keyfile", "/opt/last-human-standing/shared/exhibition-agents.json");
const COHORT = Number(arg("cohort", "1"));
const DRY_RUN = process.argv.includes("--dry-run");

// Load host env if present (prod host layout); never log values.
const HOST_ENV = "/opt/last-human-standing/shared/.env";
if (existsSync(HOST_ENV)) {
  for (const line of readFileSync(HOST_ENV, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required (host .env or environment)");
  process.exit(1);
}

const personas = JSON.parse(readFileSync(join(ROOT, "exhibition", "personas.json"), "utf8")).personas;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rest(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...opts });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${path} → ${r.status}: ${text.slice(0, 300)}`);
  return body;
}

const existingKeys = existsSync(KEYFILE) ? JSON.parse(readFileSync(KEYFILE, "utf8")) : { agents: [] };
if (existsSync(KEYFILE)) {
  const mode = (await import("node:fs")).statSync(KEYFILE).mode & 0o777;
  if (mode !== 0o600) console.warn(`WARNING: keyfile perms are ${mode.toString(8)}, want 600`);
}

const out = { ...existingKeys, cohort: COHORT, seededAt: new Date().toISOString(), agents: [...(existingKeys.agents || [])] };

for (const p of personas) {
  const known = out.agents.find((a) => a.username === p.username);

  // Existing DB row for this username?
  const existing = await rest(`users?username=eq.${encodeURIComponent(p.username)}&select=address,username,is_agent`);
  if (existing.length > 0 && !known) {
    console.log(`SKIP ${p.username}: user exists (${existing[0].address}) but no key in keyfile — cannot drive this agent`);
    continue;
  }

  const { address, privateKey } = known ?? (() => {
    const privateKey = generatePrivateKey();
    return { address: privateKeyToAccount(privateKey).address, privateKey };
  })();

  console.log(`${known ? "reseeding" : "seeding"} ${p.username} → ${address} ${DRY_RUN ? "(dry-run)" : ""}`);
  if (DRY_RUN) continue;

  await rest("users", {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      address,
      username: p.username,
      paid: true,
      platform: "exhibition-agent",
      entry_kind: "free",
      entry_token: null,
      cohort: COHORT,
      is_agent: true,
      reserved_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }),
  });
  await rest("rpc/ensure_cohort_participation", {
    method: "POST",
    body: JSON.stringify({ p_address: address, p_cohort: COHORT }),
  }).catch((e) => console.warn(`  participation row warning: ${e.message}`));

  if (!known) {
    out.agents.push({ username: p.username, address, privateKey, seededAt: new Date().toISOString() });
  }
}

if (!DRY_RUN) {
  writeFileSync(KEYFILE, JSON.stringify(out, null, 2), { mode: 0o600 });
  chmodSync(KEYFILE, 0o600);
  console.log(`keyfile written: ${KEYFILE} (${out.agents.length} agents, mode 600)`);
} else {
  console.log("dry-run complete — nothing written");
}
