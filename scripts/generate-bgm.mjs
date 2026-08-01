#!/usr/bin/env node
/**
 * Pre-compose ElevenLabs BGM stems into server/data/bgm.
 *
 *   node --import dotenv/config scripts/generate-bgm.mjs
 *   node --import dotenv/config scripts/generate-bgm.mjs --force
 *   node --import dotenv/config scripts/generate-bgm.mjs --only=ember-vigil
 */
import dotenv from "dotenv";
import { BGM_STATIONS, composeStation } from "../server/lib/bgm.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length) : null;

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY missing (set in .env / .env.local)");
  process.exit(1);
}

const stations = only
  ? BGM_STATIONS.filter((s) => s.id === only)
  : BGM_STATIONS;

if (!stations.length) {
  console.error(`No stations matched${only ? ` for --only=${only}` : ""}`);
  process.exit(1);
}

for (const station of stations) {
  process.stdout.write(`Composing ${station.id}… `);
  try {
    const path = await composeStation(station, { apiKey, force });
    console.log(`ok → ${path}`);
  } catch (e) {
    console.error(`FAILED: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
}
