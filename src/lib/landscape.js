import { mulberry32 } from "./rng.js";

/**
 * Deterministic per-cohort landscape identity.
 *
 * Borrowed from Lattice's core.hash2 principle: a deterministic hash of
 * coordinates means any renderer visiting tiles in any order gets the same
 * field. Here we apply the same idea to the backdrop: each cohort gets a
 * stable "landscape" — a visual fingerprint derived from cohort metadata,
 * not stored — so the same cohort always sees the same topo contours,
 * population scatter, and ember center across renders/devices/versions.
 *
 * IMPORTANT — data source: the client has `cohort.cohort` (a number, from
 * RoundProvider state, which mirrors server COHORT_CONFIG.cohort) and
 * `launchAt` (an ISO string, GAME_LAUNCH_AT). There is NO per-cohort UUID or
 * createdAt in the client state, so the seed is derived from those two. For
 * Cohort 1 every player therefore shares ONE landscape (same cohort number +
 * same launch time) — the "collectible per-cohort identity" payoff is real
 * but forward-looking to Cohort 2+. Stated honestly rather than implied.
 */

const LANDSCAPE_SALT = 0xdeadbeef;

/**
 * Derive a stable 32-bit landscape seed from cohort metadata.
 * Same cohort ⇒ same seed, always; different cohorts ⇒ different seeds.
 *
 * @param {number} cohortNumber  e.g. 1, 2, … (state.cohort.cohort)
 * @param {number} launchAtMs    epoch ms of the cohort launch (Date.parse(launchAt))
 * @returns {number} a non-negative integer seed
 */
export function deriveLandscapeSeed(cohortNumber, launchAtMs) {
  const num = Number.isFinite(cohortNumber) ? cohortNumber : 1;
  const ts = Number.isFinite(launchAtMs) ? Math.floor(launchAtMs) : 0;
  let hash = LANDSCAPE_SALT;
  const str = `${num}-${ts}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * All deterministic visual parameters for a cohort's backdrop, derived from
 * one seed. Additive: each maps onto an existing component prop, so absent
 * values fall back to current defaults.
 *
 * @param {number} seed  from deriveLandscapeSeed
 * @returns {{
 *   topoSeed: number,    // TopographicTexture seed — different contour shapes
 *   popSeed: number,     // PopulationField seed — different scatter pattern
 *   motifSeed: number,   // AmbientMotifs seed — different corner layout
 *   emberCx: number,     // EmberField center X (%), 30–70
 *   emberCy: number,     // EmberField center Y (%), 20–50
 *   colorBias: "warm" | "cool",
 * }}
 */
export function getLandscapeProfile(seed) {
  const rng = mulberry32(seed);
  return {
    // Offset from the day-based topo seeds (which live ~17–89) so a cohort's
    // contours differ from the generic per-day ones.
    topoSeed: 100 + Math.floor(rng() * 200), // 100–299
    popSeed: seed,
    // A distinct seed for motif corner shuffling, so changing it doesn't
    // perturb the scatter/topo streams above.
    motifSeed: seed ^ 0x51ed,
    emberCx: 30 + rng() * 40, // 30–70 %
    emberCy: 20 + rng() * 30, // 20–50 %
    colorBias: rng() > 0.5 ? "warm" : "cool",
  };
}

const LANDSCAPE_NAMES = [
  "Ash", "Ember", "Stone", "Dune", "Pine",
  "Mist", "Cinder", "Ridge", "Shale", "Thorn",
  "Sage", "Basalt", "Grove", "Flint", "Heath",
];

/**
 * Human-readable landscape identifier, e.g. "Ash-7", "Ember-12".
 * Deterministic per seed — a collectible stamp for the cohort's world.
 *
 * @param {number} seed
 * @returns {string}
 */
export function landscapeName(seed) {
  const s = Math.abs(Math.floor(seed));
  const idx = s % LANDSCAPE_NAMES.length;
  const number = Math.floor(s / LANDSCAPE_NAMES.length) + 1;
  return `${LANDSCAPE_NAMES[idx]}-${number}`;
}
