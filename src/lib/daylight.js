/**
 * Continuous daylight model for the ambient backdrop.
 *
 * Borrowed from Lattice's night system: ONE darkness/temperature value
 * driving multiple consumers. Here the consumers are:
 *   1. The radial-gradient room tint (replaces/augments DAY_ROOM_TINTS)
 *   2. Color-pool temperature
 *
 * Pure functions of (dayOfWeek, timeOfDay) — never accumulated state. The
 * underlying function is continuous; callers may quantize if they want to
 * avoid cache invalidation, but nothing here does.
 *
 * `timeOfDay` is the fraction of the current check-in window that has elapsed
 * (0 = window just opened, 1 = window closed). It is plumbed from the
 * server's round.opensAt / round.closesAt (see AppShell → AmbientBackdrop),
 * NOT synthesized client-side — so the lighting tracks real game time.
 */

/**
 * Day base temperatures. Each successive day leans slightly warmer,
 * building toward the final day's golden-hour feel.
 * Index 0 = Day 1, … 4 = Day 5.
 */
const DAY_BASE = [0.3, 0.35, 0.4, 0.45, 0.55];

/**
 * Map (dayOfWeek, timeOfDay) → a temperature in [0, 1].
 *   0   = cool blue morning
 *   0.5 = warm gold midday
 *   1   = deep ember evening
 *
 * MONOTONIC in timeOfDay by construction: both terms are non-decreasing,
 * so the room only ever warms as the check-in window progresses — no
 * midday cool-down. (The first revision used a sin curve that peaked at
 * noon and fell before the evening boost caught up; review chose the
 * strictly-warming day instead.)
 *
 * @param {number} dayOfWeek  0–4 (game day minus 1). Clamped.
 * @param {number} timeOfDay  0–1 fraction of the check-in window elapsed. Clamped.
 * @returns {number} temperature in [0, 1]
 */
export function daylightTemp(dayOfWeek, timeOfDay) {
  const d = Math.max(0, Math.min(DAY_BASE.length - 1, Math.floor(dayOfWeek)));
  const tod = Math.max(0, Math.min(1, timeOfDay));
  const dayBase = DAY_BASE[d] ?? DAY_BASE[0];

  // Steady warming through the window (non-decreasing in tod).
  const timeCurve = tod * 0.15;

  // Golden-hour acceleration after 70% of the window has passed
  // (also non-decreasing in tod, so the sum stays monotonic).
  const eveningWarm = tod > 0.7 ? (tod - 0.7) * 0.5 : 0;

  return Math.max(0, Math.min(1, dayBase + timeCurve + eveningWarm));
}

/**
 * Map a temperature (0–1) to a translucent CSS rgba color suitable for a
 * radial-gradient tint overlay.
 *
 *   cool (0)   → dusk blue  rgba(42, 58, 90, 0.12)
 *   warm (0.5) → gold       rgba(134, 100, 80, 0.12)
 *   hot  (1)   → deep ember rgba(176, 64, 24, 0.12)
 *
 * @param {number} t temperature in [0, 1]. Clamped.
 * @returns {string} an rgba() string with ~0.12 alpha
 */
export function tempToColor(t) {
  const x = Math.max(0, Math.min(1, t));
  if (x <= 0.5) {
    const s = x * 2; // 0→1 over the first (cool→warm) half
    const r = Math.round(42 + s * 92);   // 42 → 134
    const g = Math.round(58 + s * 42);  // 58 → 100
    const b = Math.round(90 - s * 10);  // 90 → 80
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  }
  const s = (x - 0.5) * 2; // 0→1 over the second (warm→hot) half
  const r = Math.round(134 + s * 42);  // 134 → 176
  const g = Math.round(100 - s * 36); // 100 → 64
  const b = Math.round(80 - s * 56);   // 80 → 24
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

/**
 * Compute the fraction of the check-in window that has elapsed.
 *
 * @param {string|null} opensAt  ISO string for window open (server round.opensAt)
 * @param {string|null} closesAt ISO string for window close (server round.closesAt)
 * @param {number} [nowMs]       current epoch ms (Date.now() by default)
 * @returns {number|null} 0–1, or null if the window is missing/invalid.
 *   Values are clamped to [0, 1] so lighting holds at dawn before open and
 *   at evening after close rather than extrapolating.
 */
export function computeTimeOfDay(opensAt, closesAt, nowMs = Date.now()) {
  if (!opensAt || !closesAt) return null;
  const open = Date.parse(opensAt);
  const close = Date.parse(closesAt);
  if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) {
    return null;
  }
  const frac = (nowMs - open) / (close - open);
  return Math.max(0, Math.min(1, frac));
}
