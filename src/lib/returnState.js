/**
 * Return-state persistence — the "last known good" snapshot of a player's
 * game position, written every time the game state loads and read on the
 * next visit to power the return experience (docs + return-experience pass).
 *
 * We persist a minimal, stable snapshot so we can detect what changed while
 * the user was away:
 *   - eliminatedWhileAway: lastKnown was "alive", server now says "eliminated"
 *   - daysAway: how many round days advanced since their last visit
 *
 * This is deliberately distinct from screen/nav position (useScreenState) —
 * it records RACE status, not UI location. Pure functions so the change
 * detection is unit-testable in isolation from React/DB.
 */

const KEY = "lhs_return_state_v1";
export { KEY };

/**
 * @typedef {Object} ReturnState
 * @property {"alive"|"eliminated"} status   the player's race status
 * @property {number} [day]                  round day the snapshot was taken on
 * @property {boolean} [checkedIn]           whether they'd checked in that day
 * @property {number} [ts]                   epoch ms of the snapshot
 */

/** Read the last-known return state, or null if never recorded / unavailable. */
export function readReturnState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !["alive", "eliminated"].includes(parsed.status)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist a new return state snapshot (merges over any existing fields).
 * @param {Partial<ReturnState>} next
 */
export function writeReturnState(next) {
  if (typeof window === "undefined") return;
  if (!next || !["alive", "eliminated"].includes(next.status)) return;
  const merged = { ...next, ts: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* storage unavailable — best-effort */
  }
}

/** Clear the persisted return state (used on explicit reset / logout). */
export function clearReturnState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Did a player go from "alive" (in their last-known snapshot) to
 * "eliminated" (per the server)? The emotional-payoff trigger.
 * @param {ReturnState|null} prev
 * @param {ReturnState} next
 * @returns {boolean}
 */
export function detectEliminationWhileAway(prev, next) {
  if (!prev || !next) return false;
  return prev.status === "alive" && next.status === "eliminated";
}

/**
 * How many round days advanced between the last snapshot and now.
 * 0 means the game is on the same day (or no day history).
 * @param {number|string|null|undefined} prevDay
 * @param {number|string|null|undefined} nextDay
 * @returns {number} non-negative integer
 */
export function computeDaysAway(prevDay, nextDay) {
  const prev = Number(prevDay ?? NaN);
  const next = Number(nextDay ?? NaN);
  if (!Number.isFinite(prev) || !Number.isFinite(next)) return 0;
  return Math.max(0, next - prev);
}

/**
 * The set of round days the player missed, given the day they last saw and
 * the current day. Returns [] when nothing was missed.
 * @param {number} lastSeenDay
 * @param {number} currentDay
 * @returns {number[]}
 */
export function missedDayNumbers(lastSeenDay, currentDay) {
  const from = Number(lastSeenDay ?? NaN);
  const to = Number(currentDay ?? NaN);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  if (to <= from || to - from > 999) return [];
  const out = [];
  for (let d = from + 1; d < to; d++) out.push(d);
  return out;
}

export default {
  readReturnState,
  writeReturnState,
  clearReturnState,
  detectEliminationWhileAway,
  computeDaysAway,
  missedDayNumbers,
  KEY,
};
