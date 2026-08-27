/**
 * Deterministic survival lottery — the "non-speed overflow rule" from
 * docs/RIDDLE_ROUNDS.md §5.1.
 *
 * When eligible check-ins exceed the survival cap, survival is decided by a
 * deterministic Fisher–Yates shuffle seeded from `hash(cohort_seed, day)`,
 * NOT by first-come check-in timestamp. This kills the 3am timezone race
 * without the full scoring engine (which is Cohort 2 scope).
 *
 * Same seed + same eligible list → same survivors. Replayable by anyone.
 * Reuses the same Mulberry32 + Fisher-Yates pattern from lottery.js.
 */

import { createHash } from "node:crypto";

/** Mulberry32 PRNG — returns a function yielding [0, 1). */
function mulberry32(seedU32) {
  let a = seedU32 >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle in place, using the given PRNG. */
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute the per-day draw seed string.
 * Public + auditable — anyone can reproduce the draw with this seed.
 *
 * @param {string} cohortSeed  the cohort's public seed (e.g. lotterySeed())
 * @param {number} day         game day (1-5)
 * @returns {string}           e.g. "2026-09-01T18:00:00Z:cohort-1:lottery:day-3"
 */
export function survivalSeedString(cohortSeed, day) {
  return `${cohortSeed}:day-${day}:survival`;
}

/**
 * Hash the seed string into a 32-bit unsigned integer for the PRNG.
 */
export function seedToU32(seed) {
  const hex = createHash("sha256").update(seed, "utf8").digest("hex");
  return Buffer.from(hex.slice(0, 8), "hex").readUInt32BE(0);
}

export const ALGORITHM_VERSION = "mulberry32-fy-survival/v1";

/**
 * Draw survivors from a list of eligible check-ins using a deterministic
 * lottery. Same cohortSeed + same day + same eligible list → same survivors.
 *
 * @param {Array<{address: string, rank?: number}>} eligible  all check-ins within the window
 * @param {{ cohortSeed: string, day: number, cap: number }} opts
 * @returns {{
 *   seed: string,
 *   algorithmVersion: string,
 *   cap: number,
 *   eligible: number,
 *   survivors: string[],       addresses in lottery order (first `cap` survive)
 *   eliminated: string[],      remaining eligible addresses
 *   overflow: boolean,         true if eligible > cap (lottery actually ran)
 * }}
 */
export function drawSurvivalLottery(eligible, { cohortSeed, day, cap }) {
  if (!Array.isArray(eligible)) {
    throw new TypeError("eligible must be an array");
  }
  if (typeof cap !== "number" || cap < 0) {
    throw new RangeError("cap must be a non-negative number");
  }

  const seed = survivalSeedString(cohortSeed, day);
  const rng = mulberry32(seedToU32(seed));

  // Defensive copy, sorted by address for input-order independence
  // (the seed is the only source of randomness, not check-in order).
  const pool = eligible.map((e) => ({
    address: String(e.address).toLowerCase(),
    rank: Number(e.rank) || 0,
  }));
  pool.sort((a, b) => a.address.localeCompare(b.address));

  shuffle(pool, rng);

  const survivors = pool.slice(0, cap).map((e) => e.address);
  const eliminated = pool.slice(cap).map((e) => e.address);
  const overflow = eligible.length > cap;

  return {
    seed,
    algorithmVersion: ALGORITHM_VERSION,
    cap,
    eligible: eligible.length,
    survivors,
    eliminated,
    overflow,
  };
}

export default { drawSurvivalLottery, survivalSeedString, seedToU32, ALGORITHM_VERSION };
