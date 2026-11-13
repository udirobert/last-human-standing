/**
 * NIGHT SHIFT crossover — shared daily-docket convention.
 *
 * The standalone jam game (game-off/) derives its default docket from the
 * local date as `YYYY-MM-DD`, and accepts `?seed=<anything>` to replay a
 * custom docket. This app links out with the same convention so a player
 * closing the day here lands on tonight's desk there — one-way, optional,
 * no runtime dependency either direction.
 *
 * Set NIGHT_SHIFT_URL to the live itch page (or a self-hosted copy) once
 * the Game Off build is uploaded. Until then the link stays unrendered.
 */

// TODO(itch): point at the live page once uploaded — e.g.
// https://udirobert.itch.io/night-shift
export const NIGHT_SHIFT_URL = null;

export function nightShiftDocketUrl(date = new Date()) {
  if (!NIGHT_SHIFT_URL) return null;
  const seed = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `${NIGHT_SHIFT_URL}${NIGHT_SHIFT_URL.includes("?") ? "&" : "?"}seed=${seed}`;
}
