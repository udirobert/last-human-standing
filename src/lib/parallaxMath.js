/**
 * Pure helpers for the parallax depth system (see useParallaxDepth).
 *
 * Extracted so the bug-fix logic — desktop null-event detection and tilt/mouse
 * clamping — is unit-testable without framer-motion (the hook itself wraps
 * these in MotionValues + listeners).
 */

export const MAX_SHIFT_PX = 14;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Does a DeviceOrientationEvent carry real sensor data?
 *
 * Desktop Chrome defines DeviceOrientationEvent as a constructor but has no
 * real sensor, so it fires events with alpha/beta/gamma all null. This
 * predicate is what lets the mouse fallback keep working on desktop instead
 * of being skipped (the original proposal's bug).
 *
 * @param {DeviceOrientationEvent | null} e
 * @returns {boolean}
 */
export function isRealOrientationEvent(e) {
  if (!e) return false;
  return e.alpha != null || e.beta != null || e.gamma != null;
}

/**
 * Map device tilt (degrees) to a parallax shift in px, clamped to ±MAX_SHIFT_PX.
 * gamma = left/right tilt, beta = front/back tilt. A gentle /45 slice so
 * modest tilts already read.
 *
 * @param {number} gamma
 * @param {number} beta
 * @returns {{ x: number, y: number }}
 */
export function orientationToShift(gamma, beta) {
  return {
    x: clamp(((gamma ?? 0) / 45) * MAX_SHIFT_PX, -MAX_SHIFT_PX, MAX_SHIFT_PX),
    y: clamp(((beta ?? 0) / 45) * MAX_SHIFT_PX, -MAX_SHIFT_PX, MAX_SHIFT_PX),
  };
}

/**
 * Map a pointer position to a parallax shift in px, clamped to ±MAX_SHIFT_PX.
 * clientX/clientY are in viewport pixels; vw/vh are viewport dimensions.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} vw
 * @param {number} vh
 * @returns {{ x: number, y: number }}
 */
export function mouseToShift(clientX, clientY, vw, vh) {
  const nx = (clientX / vw - 0.5) * 2; // -1..1
  const ny = (clientY / vh - 0.5) * 2;
  return {
    x: clamp(nx * MAX_SHIFT_PX, -MAX_SHIFT_PX, MAX_SHIFT_PX),
    y: clamp(ny * MAX_SHIFT_PX, -MAX_SHIFT_PX, MAX_SHIFT_PX),
  };
}
