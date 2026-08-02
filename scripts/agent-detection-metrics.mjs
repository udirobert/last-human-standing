#!/usr/bin/env node
/**
 * agent-detection-metrics.mjs — ground-truth scoring for the exhibition.
 *
 * Joins final submission verdicts against the is_agent labels ONLY THE
 * OPERATOR KNOWS and prints the confusion matrix per day/persona. This is
 * the dataset the future mixed game is built on (precision = of everything
 * the crowd flagged, how much was machine; recall = of all machines, how
 * many the crowd caught).
 *
 * Run on the prod host (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the
 * shared .env), from the release dir:
 *   node scripts/agent-detection-metrics.mjs            # all closed days
 *   node scripts/agent-detection-metrics.mjs --day 2
 *   node scripts/agent-detection-metrics.mjs --out /path/report.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const HOST_ENV = "/opt/last-human-standing/shared/.env";
if (existsSync(HOST_ENV)) {
  for (const line of readFileSync(HOST_ENV, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
if (!URL_ || !KEY) { console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const DAY = arg("day", null) ? Number(arg("day")) : null;
const OUT = arg("out", null);

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function rest(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers });
  if (!r.ok) throw new Error(`${path} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const subs = await rest(`submissions?select=id,day,address,username,status,created_at${DAY ? `&day=eq.${DAY}` : ""}&order=day`);
if (subs.length === 0) { console.log("no submissions found"); process.exit(0); }
const addrs = [...new Set(subs.map((s) => s.address.toLowerCase()))];
const agents = await rest(`users?is_agent=eq.true&select=address,username&or=(${addrs.map((a) => `address.ilike.${a}`).join(",")})`);
const agentSet = new Set(agents.map((a) => a.address.toLowerCase()));

const votes = await rest(`votes?select=submission_id,vote,weight&submission_id=in.(${subs.map((s) => s.id).join(",")})`);
const tally = new Map();
for (const v of votes) {
  const t = tally.get(v.submission_id) || { real: 0, fake: 0 };
  t[v.vote] += Number(v.weight) || 1;
  tally.set(v.submission_id, t);
}

function bucket(rows) {
  const m = { tp: 0, fp: 0, tn: 0, fn: 0, pending: 0, n: rows.length };
  for (const s of rows) {
    const truth = agentSet.has(s.address.toLowerCase()) ? "agent" : "human";
    if (s.status === "pending") { m.pending++; continue; }
    const pred = s.status === "flagged" ? "agent" : "human";
    if (pred === "agent" && truth === "agent") m.tp++;
    else if (pred === "agent") m.fp++;
    else if (truth === "agent") m.fn++;
    else m.tn++;
  }
  const resolved = m.tp + m.fp + m.tn + m.fn;
  m.precision = m.tp + m.fp ? +(m.tp / (m.tp + m.fp)).toFixed(3) : null;
  m.recall = m.tp + m.fn ? +(m.tp / (m.tp + m.fn)).toFixed(3) : null;
  m.resolvedRate = m.n ? +(resolved / m.n).toFixed(3) : null;
  return m;
}

const report = { generatedAt: new Date().toISOString(), day: DAY, overall: bucket(subs), byDay: {}, byPersona: {}, submissions: subs.length };
for (const d of [...new Set(subs.map((s) => s.day))].sort()) {
  report.byDay[d] = bucket(subs.filter((s) => s.day === d));
}
for (const a of agents) {
  report.byPersona[a.username] = bucket(subs.filter((s) => s.address.toLowerCase() === a.address.toLowerCase()));
}

console.log(`\n=== Agent detection — ground truth report (${subs.length} submissions) ===`);
console.log(`OVERALL  tp=${report.overall.tp} fp=${report.overall.fp} fn=${report.overall.fn} tn=${report.overall.tn} pending=${report.overall.pending}`);
console.log(`         precision=${report.overall.precision ?? "—"} recall=${report.overall.recall ?? "—"} resolved=${report.overall.resolvedRate ?? "—"}`);
for (const [d, m] of Object.entries(report.byDay)) {
  console.log(`DAY ${d}    tp=${m.tp} fp=${m.fp} fn=${m.fn} tn=${m.tn} | precision=${m.precision ?? "—"} recall=${m.recall ?? "—"}`);
}
for (const [u, m] of Object.entries(report.byPersona)) {
  console.log(`${u.padEnd(16)} n=${m.n} caught=${m.tp} slipped=${m.fn} pending=${m.pending}`);
}
if (OUT) { writeFileSync(OUT, JSON.stringify(report, null, 2)); console.log(`\nwritten: ${OUT}`); }
