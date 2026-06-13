#!/usr/bin/env node
/**
 * migrate.mjs — One-shot migration runner for last-human-standing.
 *
 * Usage:
 *   1. Get the Supabase database connection string from the
 *      Supabase dashboard: Project Settings → Database →
 *      Connection string → "Direct connection" (URI).
 *   2. Set it as DATABASE_URL in the environment, or pass it as
 *      the first arg:  node scripts/migrate.mjs "$DB_URL"
 *   3. The script runs every supabase/migrations/*.sql file in
 *      order, then optionally runs docs/LAUNCH_RESET.md's
 *      stale-data delete if --reset is passed.
 *
 * Idempotent — every migration file is wrapped in IF NOT EXISTS
 * and DO blocks so re-runs are safe.
 *
 * Requires: node 18+ (uses built-in fetch + no deps).
 */

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");

const args = process.argv.slice(2);
const dbUrl = args.find((a) => a.startsWith("postgres://") || a.startsWith("postgresql://"))
  || process.env.DATABASE_URL;
const doReset = args.includes("--reset");

if (!dbUrl) {
  console.error("No DATABASE_URL. Pass it as the first arg or set the env var.");
  console.error("Get it from: Supabase dashboard → Project Settings → Database → Connection string");
  process.exit(1);
}

function runPsql(sql, label) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [
      dbUrl,
      "-v", "ON_ERROR_STOP=1",
      "-X", // no .psqlrc
      "-q",
      "-c", sql,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`  ✓ ${label}`);
        resolve(stdout);
      } else {
        reject(new Error(`psql exited ${code}\n${stderr}`));
      }
    });
  });
}

async function main() {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  console.log(`Migrations to run: ${files.length}`);
  for (const f of files) {
    const sql = await readFile(join(migrationsDir, f), "utf8");
    console.log(`\n→ ${f}`);
    await runPsql(sql, f);
  }
  if (doReset) {
    const reset = `
      delete from public.users
       where paid = true
         and eliminated = true
         and last_seen_at < now() - interval '30 days'
         and referral_count = 0;
    `;
    console.log(`\n→ reset (stale dev-session cohort data)`);
    const out = await runPsql(reset, "stale-data delete");
    console.log(out.trim());
  }
  console.log("\nAll done.");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
