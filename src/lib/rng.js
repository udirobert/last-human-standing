/**
 * Shared deterministic PRNG for backdrop + world visuals.
 *
 * mulberry32 — small, fast, deterministic. Used by PopulationField,
 * TopographicTexture, and the landscape seed system so a given seed always
 * produces the same field, regardless of render order (the Lattice insight:
 * a hash doesn't depend on draw order, an Rng stream does).
 *
 * Previously duplicated as a local function in PopulationField.jsx and
 * TopographicTexture.jsx — extracted here so all three sites share one
 * implementation and the landscape module can import it.
 *
 * @param {number} seed - any 32-bit integer
 * @returns {() => number} a function returning floats in [0, 1)
 */
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
