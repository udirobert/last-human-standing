/**
 * Deterministic lottery draw for the free cohort slots.
 *
 * Same seed → same output. Replayable. Verifiable.
 *
 * The algorithm is a Mulberry32 PRNG seeded from a hex-decoded
 * SHA-256 hash. We Fisher-Yates shuffle the candidate list using
 * the PRNG output and take the first `slots` entries.
 *
 * Why Mulberry32: small, fast, well-distributed, easy to verify
 * by hand or with any language. We don't need cryptographic
 * randomness — we need reproducible randomness from a public
 * seed. Investors and mentors can re-run this code with the same
 * seed and confirm the same winners.
 *
 * The seed format is documented in docs/ENTRY_MODEL_PLAN.md:
 *   `${GAME_LAUNCH_AT}:cohort-${cohort}:lottery`
 */

import { createHash } from "node:crypto";

export const ALGORITHM_VERSION = "mulberry32-fy/v1";

/** Hex-decode a string into a 32-bit unsigned integer. */
function hexToU32(hex) {
  // Take the first 8 hex chars (32 bits) of the SHA-256 of the seed.
  const buf = Buffer.from(hex, "hex");
  return buf.readUInt32BE(0);
}

/** Mulberry32 PRNG — returns a function that yields [0, 1). */
function mulberry32(seedU32) {
  let a = seedU32 >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute the seed for a cohort's lottery.
 * Public — investors can call this with the same launch timestamp
 * and get the same seed we did.
 */
export function lotterySeed({ launchAtIso, cohort }) {
  return `${launchAtIso}:cohort-${cohort}:lottery`;
}

/**
 * Hash the seed into a 32-bit seed for the PRNG. SHA-256 is
 * overkill for a PRNG seed but it makes the result insensitive
 * to string-encoding details (UTF-8 vs ASCII, etc.).
 */
export function seedToU32(seed) {
  const hex = createHash("sha256").update(seed, "utf8").digest("hex");
  return hexToU32(hex.slice(0, 8));
}

/**
 * Fisher-Yates shuffle, in place, using the given PRNG. Returns
 * the same array.
 */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw winners from a list of free candidates.
 *
 * @param {Array<{address: string, username?: string|null, referral_count?: number}>} candidates
 * @param {{ launchAtIso: string, cohort: number, slots: number }} opts
 * @returns {{
 *   seed: string,
 *   algorithmVersion: string,
 *   slots: number,
 *   candidates: number,
 *   drawn: Array<{address: string, username: string|null, referral_count: number, rank: number}>,
 *   rolledToCohort2: typeof candidates
 * }}
 */
export function drawLottery(candidates, { launchAtIso, cohort, slots }) {
  if (!Array.isArray(candidates)) {
    throw new TypeError("candidates must be an array");
  }
  if (typeof slots !== "number" || slots < 0) {
    throw new RangeError("slots must be a non-negative number");
  }
  const seed = lotterySeed({ launchAtIso, cohort });
  const rng = mulberry32(seedToU32(seed));

  // Defensive copy so we don't mutate the caller's list.
  const pool = candidates.map((c) => ({ ...c }));
  shuffle(pool, rng);

  const drawn = pool.slice(0, slots).map((c, i) => ({
    address: c.address,
    username: c.username ?? null,
    referral_count: c.referral_count ?? 0,
    rank: i + 1,
  }));
  const rolledToCohort2 = pool.slice(slots);

  return {
    seed,
    algorithmVersion: ALGORITHM_VERSION,
    slots,
    candidates: candidates.length,
    drawn,
    rolledToCohort2,
  };
}

// Cohort composition constants. Kept here so the math is testable
// in isolation from the database.
export const COHORT_SIZE = 50;
export const COHORT_PAID_SLOTS = 25;
export const COHORT_FREE_SLOTS = 25;

/**
 * Compute the actual free-lottery slot count at draw time.
 *
 * The cohort model is 25 paid (guaranteed) + 25 free (lottery).
 * Unfilled paid slots promote into the free lottery so a
 * low-pay day doesn't leave the cohort half-empty at launch:
 *   - 0  paid   → free draws up to 50  (everyone is in)
 *   - 10 paid   → free draws up to 40
 *   - 25 paid   → free draws up to 25  (paid cap reached)
 *   - 30 paid   → free draws up to 20  (cohort cap reached)
 *   - 50 paid   → free draws 0         (lottery is moot)
 * Capped at COHORT_SIZE and floored at 0 so the math is always
 * coherent: a free lottery of 25 with 25 paid = full cohort.
 */
export function freeSlotsFor(paidCount) {
  const paid = Math.max(0, Number.isFinite(paidCount) ? paidCount : 0);
  return Math.max(0, Math.min(COHORT_SIZE, COHORT_SIZE - paid));
}
