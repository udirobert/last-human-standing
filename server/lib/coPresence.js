/**
 * Co-presence attestation — docs/TOKEN_ROUNDS.md §2.
 *
 * "A Token is digital but its transfer requires physical co-presence."
 *
 * GPS is spoofable in seconds, so a server-side geofence ("you must be inside
 * this circle to claim") is defeated by one app on a laptop. The defence is
 * that the attestation is MUTUAL: two verified humans must both participate in
 * a fresh, single-use nonce exchange. That raises the cost of cheating from
 * "toggle a setting" to "coordinate two fraudulent devices in place, in real
 * time".
 *
 * This module is PURE — it decides whether an attestation is valid and why.
 * It never touches the database; `server/routes/cocircle.js` persists the
 * result. Testable in isolation.
 *
 * KNOWN AND ACCEPTED WEAKNESS: two phones in one flat can fake co-presence.
 * The graduated mitigation is an acoustic sonar challenge required once a
 * token or territory is high-value (see docs/TOKEN_ROUNDS.md §4.1).
 */

import { haversineMeters, checkGpsPlausibility } from "../anticheat.js";

/** Default co-presence radius. Both parties must be within this of each other. */
export const DEFAULT_RADIUS_M = 50;

/** Nonce lifetime. Long enough for two humans to meet, short enough to stop replay. */
export const DEFAULT_NONCE_TTL_MS = 60_000;

/**
 * A device claiming sub-10m GPS accuracy outdoors is almost always a spoof or
 * a stationary emulator. Catches the "pin exactly on my partner" attack that
 * a pure radius check would otherwise allow.
 */
export const MAX_PLAUSIBLE_ACCURACY_M = 35;

function isFiniteNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function lower(addr) {
  return typeof addr === "string" ? addr.toLowerCase() : "";
}

/**
 * Validate a completed mutual attestation.
 *
 * @param {object} input
 * @param {string} input.challenger        - address that opened the nonce exchange
 * @param {string} input.responder         - address that completed it
 * @param {string} [input.nonce]           - the nonce both parties presented
 * @param {string} [input.expectedNonce]   - nonce the server issued
 * @param {{lat:number,lng:number}} [input.challengerPoint]
 * @param {{lat:number,lng:number}} [input.responderPoint]
 * @param {number} [input.accuracyM]       - reported GPS accuracy
 * @param {string|number} [input.createdAt] - when the nonce was issued (ISO or ms)
 * @param {string|number} [input.now]       - evaluation time (ISO or ms); defaults to Date.now()
 * @param {number} [input.radiusM]         - co-presence radius, default DEFAULT_RADIUS_M
 * @param {number} [input.nonceTtlMs]      - nonce freshness window
 * @param {string} [input.handshakeStatus] - prior status, to block replays
 * @param {Array<{nonce:string,challenger?:string,responder?:string}>} [input.priorNonces]
 *        - nonces already consumed (or in flight) in this region
 * @returns {{ok:boolean, reason:string|null, distanceM:number|null, detail:object}}
 */
export function buildAttestation(input = {}) {
  const {
    challenger,
    responder,
    nonce,
    expectedNonce,
    challengerPoint,
    responderPoint,
    accuracyM = null,
    createdAt,
    now = Date.now(),
    radiusM = DEFAULT_RADIUS_M,
    nonceTtlMs = DEFAULT_NONCE_TTL_MS,
    handshakeStatus = "pending",
    priorNonces = [],
  } = input;

  const chal = lower(challenger);
  const resp = lower(responder);

  const reject = (reason, extra = {}) => ({
    ok: false,
    reason,
    distanceM: null,
    detail: { challenger: chal, responder: resp, ...extra },
  });

  // --- Party sanity -------------------------------------------------------
  if (!chal) return reject("missing_challenger");
  if (!resp) return reject("missing_responder");
  // A handshake with yourself proves nothing about co-presence.
  if (chal === resp) return reject("self_attestation");

  // --- Replay: an already-settled handshake cannot be re-presented --------
  if (handshakeStatus && handshakeStatus !== "pending") {
    return reject("replay", { handshakeStatus });
  }

  // --- Nonce binding ------------------------------------------------------
  // Mutual means BOTH parties prove they saw the same server-issued nonce.
  if (expectedNonce != null) {
    if (!nonce) return reject("missing_nonce");
    if (nonce !== expectedNonce) return reject("nonce_mismatch");
  }

  // Only a CONSUMED nonce blocks. A nonce merely in flight on another row is
  // the live exchange, not a replay — that is why the caller passes rows
  // without a status (pending) so the two-person handshake can complete.
  const consumed = new Set(
    (priorNonces || [])
      .filter(Boolean)
      .map((n) => (typeof n === "string" ? n : n.nonce))
      .filter(Boolean),
  );
  if (nonce && consumed.has(nonce)) return reject("nonce_replay");

  // --- Nonce freshness ----------------------------------------------------
  if (createdAt != null) {
    const issuedMs = typeof createdAt === "number" ? createdAt : Date.parse(createdAt);
    const nowMs = typeof now === "number" ? now : Date.parse(now);

    if (!Number.isFinite(issuedMs) || !Number.isFinite(nowMs)) {
      return reject("invalid_timestamp");
    }
    const ageMs = nowMs - issuedMs;
    // Issued in the future beyond a hair = clock skew or a forged claim.
    if (ageMs < -5_000) return reject("nonce_from_future", { ageMs });
    if (ageMs > nonceTtlMs) return reject("stale_nonce", { ageMs });
  }

  // --- Coordinates --------------------------------------------------------
  const cp = challengerPoint;
  const rp = responderPoint;
  if (!cp || !rp || !isFiniteNum(cp.lat) || !isFiniteNum(cp.lng) ||
      !isFiniteNum(rp.lat) || !isFiniteNum(rp.lng)) {
    return reject("missing_coordinates");
  }

  const outOfWorld =
    Math.abs(cp.lat) > 90 || Math.abs(rp.lat) > 90 ||
    Math.abs(cp.lng) > 180 || Math.abs(rp.lng) > 180;
  if (outOfWorld) return reject("invalid_coordinates");

  const distanceM = Math.round(haversineMeters(cp.lat, cp.lng, rp.lat, rp.lng));

  // --- GPS plausibility ---------------------------------------------------
  // Checked BEFORE the distance gate so a spoofed device is reported as a
  // spoof rather than as a harmless "too far". Reuse the v2 detector rather
  // than reimplementing it: the accuracy-mismatch rules are exactly what
  // raises the bar for the two-phones-in-one-flat case.
  if (isFiniteNum(accuracyM)) {
    if (accuracyM > MAX_PLAUSIBLE_ACCURACY_M) {
      return reject("implausible_accuracy", { distanceM, accuracyM });
    }
    // Reuse the v2 detector, but ONLY its spoof-signature rules. Its
    // `gps_outside_radius` rule is not a spoof signal — the pair-distance
    // gate below already owns distance, and letting the detector fire on it
    // first would report every distant pair as a spoof.
    const gpsFlag = checkGpsPlausibility(distanceM, accuracyM, radiusM);
    if (gpsFlag && gpsFlag !== "gps_outside_radius") {
      return reject("implausible_gps", { distanceM, accuracyM, gpsFlag });
    }
  }

  // --- Distance -----------------------------------------------------------
  // Last, so the most informative rejection reason wins.
  if (distanceM > radiusM) {
    return reject("too_far", { distanceM, radiusM });
  }

  return {
    ok: true,
    reason: null,
    distanceM,
    detail: { challenger: chal, responder: resp, distanceM, accuracyM },
  };
}

/**
 * Nearest verified humans to a point, for the "someone is nearby" affordance.
 * Pure so it can be tested; the caller supplies already-fetched players and
 * does the filtering it needs.
 *
 * @param {{lat:number,lng:number}} origin
 * @param {Array<{address:string, lat:number, lng:number}>} players
 * @param {{radiusM?:number, limit?:number}} [opts]
 * @returns {Array<{address:string, distanceM:number}>}
 */
export function nearestPlayers(origin, players, { radiusM = 5000, limit = 25 } = {}) {
  if (!origin || !isFiniteNum(origin.lat) || !isFiniteNum(origin.lng)) return [];

  return (players || [])
    .filter((p) => p && isFiniteNum(p.lat) && isFiniteNum(p.lng))
    .map((p) => ({
      address: lower(p.address),
      distanceM: Math.round(haversineMeters(origin.lat, origin.lng, p.lat, p.lng)),
    }))
    .filter((p) => p.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

export default { buildAttestation, nearestPlayers, DEFAULT_RADIUS_M, DEFAULT_NONCE_TTL_MS, MAX_PLAUSIBLE_ACCURACY_M };