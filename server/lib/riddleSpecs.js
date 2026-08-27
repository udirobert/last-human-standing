/**
 * Riddle spec generation, hashing, and commit-reveal.
 *
 * docs/RIDDLE_ROUNDS.md §2.1: at ask-time ARIA generates a riddle + a hidden
 * resolution spec. The spec is hashed and committed BEFORE any submission
 * exists — "commit-reveal applied to judging itself." The spec is revealed
 * at T+18h (round close, before voting) so voters judge against the real
 * criteria.
 *
 * The spec_hash is computed before the round opens and stored in
 * round_specs. The spec_jsonb is only revealed (revealed_at set) at close.
 *
 * For Sep 1: riddles are pre-authored (human-reviewed per §6 risk
 * mitigation) and embedded in the migration. ARIA can generate them
 * autonomously for Cohort 2+.
 */

import { createHash } from "node:crypto";

/**
 * Compute the commit hash for a resolution spec.
 * The hash is of the canonical JSON — same spec → same hash, always.
 *
 * @param {object} spec  the resolution spec object
 * @returns {string}     0x-prefixed hex hash
 */
export function computeSpecHash(spec) {
  const canonical = JSON.stringify(spec, Object.keys(spec).sort());
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `0x${hash}`;
}

/**
 * Verify that a revealed spec matches its committed hash.
 *
 * @param {object} spec       the revealed spec
 * @param {string} specHash   the committed hash (0x-prefixed)
 * @returns {boolean}
 */
export function verifySpecHash(spec, specHash) {
  if (!specHash || typeof specHash !== "string") return false;
  return computeSpecHash(spec) === specHash.toLowerCase();
}

/**
 * Pre-authored riddles for the Sep 1 retry (days 1-5).
 * Human-reviewed per §6 ("generate the week's riddles ahead of time and
 * human-review them before the cohort starts").
 *
 * Each entry has: riddle (the public prompt), spec (the hidden resolution
 * criteria), and place_type (for backward-compat with the rounds table).
 */
export const RIDDLE_SETS = [
  {
    day: 1,
    riddle: "Find the place where strangers become regulars. Bring proof.",
    placeType: "THE GATHERING",
    spec: {
      literal_categories: ["cafe", "bar", "diner", "barbershop", "gym", "pub"],
      required_elements: ["another human in frame OR a named regular"],
      interpretive_axes: ["familiarity", "repetition", "belonging"],
      hard_rejects: ["stock photo", "screenshot", "AI-generated", "no person or context"],
    },
  },
  {
    day: 2,
    riddle: "Somewhere the city forgot to pave. Show me green.",
    placeType: "THE WILD",
    spec: {
      literal_categories: ["park", "garden", "forest", "field", "trail", "rooftop garden"],
      required_elements: ["visible greenery OR natural ground"],
      interpretive_axes: ["wildness", "contrast with urban", "intentionality"],
      hard_rejects: ["stock photo", "screenshot", "AI-generated", "paved-only surface"],
    },
  },
  {
    day: 3,
    riddle: "Proof you are loved by at least one other human.",
    placeType: "THE BOND",
    spec: {
      literal_categories: ["with friend", "family gathering", "couple", "team", "community event"],
      required_elements: ["at least two humans in frame OR a tangible artifact of connection"],
      interpretive_axes: ["intimacy", "reciprocity", "genuineness"],
      hard_rejects: ["stock photo", "screenshot", "AI-generated", "single person selfie with no connection"],
    },
  },
  {
    day: 4,
    riddle: "A place that asks you to be quiet. Show me the silence.",
    placeType: "THE QUIET",
    spec: {
      literal_categories: ["library", "bookstore", "museum", "temple", "study hall", "cemetery"],
      required_elements: ["a space designed for quiet OR an explicit quiet cue"],
      interpretive_axes: ["reverence", "stillness", "intentionality"],
      hard_rejects: ["stock photo", "screenshot", "AI-generated", "obviously noisy setting"],
    },
  },
  {
    day: 5,
    riddle: "Proof you were first to see the day. Show me the dawn.",
    placeType: "THE DAWN",
    spec: {
      literal_categories: ["sunrise", "golden hour morning", "dawn sky", "morning horizon"],
      required_elements: ["sky with dawn light OR a clock/timestamp proving early morning"],
      interpretive_axes: ["temporal proof", "stillness of early morning", "effort"],
      hard_rejects: ["stock photo", "screenshot", "AI-generated", "sunset mislabeled as sunrise"],
    },
  },
];

/**
 * Get the pre-authored riddle + spec for a given day.
 * Returns null for days outside the set.
 *
 * @param {number} day  1-5
 * @returns {{day: number, riddle: string, placeType: string, spec: object, specHash: string} | null}
 */
export function getRiddleForDay(day) {
  const entry = RIDDLE_SETS.find((r) => r.day === day);
  if (!entry) return null;
  return {
    day: entry.day,
    riddle: entry.riddle,
    placeType: entry.placeType,
    spec: entry.spec,
    specHash: computeSpecHash(entry.spec),
  };
}

/**
 * All pre-authored riddles with their commit hashes.
 * Used by the migration to seed round_specs at cohort start.
 */
export function allRiddleCommits() {
  return RIDDLE_SETS.map((r) => ({
    day: r.day,
    riddle: r.riddle,
    placeType: r.placeType,
    spec: r.spec,
    specHash: computeSpecHash(r.spec),
  }));
}

export default { computeSpecHash, verifySpecHash, getRiddleForDay, allRiddleCommits, RIDDLE_SETS };
