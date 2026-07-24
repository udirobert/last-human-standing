/**
 * Anti-cheat detection helpers.
 * Each function returns a flag reason string if suspicious, or null if clean.
 */

/**
 * @param {number|null} distanceM - Haversine distance from round center in meters
 * @param {number|null} accuracyM - GPS accuracy reported by the device in meters
 * @param {number} radiusM - Round check-in radius in meters
 * @returns {string|null} reason if flagged, null if clean
 */
function checkGpsPlausibility(distanceM, accuracyM, radiusM) {
  if (distanceM === null) return null;

  // Exact zero distance with poor accuracy is suspicious
  if (distanceM < 1 && accuracyM !== null && accuracyM > 20) {
    return "gps_zero_with_poor_accuracy";
  }

  // Check-in further out than the round allows
  if (radiusM > 0 && distanceM > radiusM * 1.2) {
    return "gps_outside_radius";
  }

  // Distance claim is implausibly small relative to reported accuracy
  if (distanceM < 2 && accuracyM !== null && accuracyM > distanceM * 3) {
    return "gps_accuracy_mismatch";
  }

  return null;
}

/**
 * @param {string} address
 * @param {number} day
 * @param {Array<{address: string, day: number, created_at: string}>} recentCheckins
 * @param {number} minIntervalMs - Minimum allowed interval between check-ins (default 30_000)
 * @returns {string|null}
 */
function checkTimingAnomaly(address, day, recentCheckins, minIntervalMs = 30_000) {
  const mine = recentCheckins
    .filter((c) => c.address?.toLowerCase() === address.toLowerCase() && c.day === day)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (mine.length < 2) return null;

  const last = new Date(mine[0].created_at).getTime();
  const prev = new Date(mine[1].created_at).getTime();
  if (last - prev < minIntervalMs) {
    return "rapid_recheckin";
  }
  return null;
}

/**
 * @param {string} voterAddress
 * @param {number} submissionId
 * @param {Array<{submission_id: number, voter_address: string, vote: string}>} allVotes
 * @param {Array<{id: number, status: string}>} submissions
 * @param {number} minSamples - Minimum completed votes needed to evaluate ring (default 5)
 * @returns {string|null}
 */
function checkVoteRing(voterAddress, submissionId, allVotes, submissions, minSamples = 5) {
  const voterLower = voterAddress.toLowerCase();
  const voterVotes = allVotes
    .filter((v) => v.voter_address?.toLowerCase() === voterLower && v.submission_id !== submissionId)
    .map((v) => {
      const sub = submissions.find((s) => s.id === v.submission_id);
      return sub?.status && sub.status !== "pending" ? v.vote : null;
    })
    .filter(Boolean);

  if (voterVotes.length < minSamples) return null;

  const real = voterVotes.filter((v) => v === "real").length;
  const total = voterVotes.length;
  const realRatio = total > 0 ? real / total : 0;

  // Always votes "real" on verified submissions (potential vote ring / coordination)
  if (realRatio >= 0.9) return "vote_ring_real_always";
  if (realRatio <= 0.1) return "vote_ring_fake_always";

  return null;
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Velocity spoof detection — flags impossible travel between check-ins.
 *
 * Compares the user's previous check-in GPS coords with the current
 * submission. If the implied speed exceeds a plausible maximum
 * (commercial air travel + margin), the check-in is flagged.
 *
 * @param {number|null} prevLat - Previous check-in latitude
 * @param {number|null} prevLng - Previous check-in longitude
 * @param {number|string|null} prevTimeMs - Previous check-in timestamp (ms epoch or ISO)
 * @param {number} curLat - Current check-in latitude
 * @param {number} curLng - Current check-in longitude
 * @param {number} curTimeMs - Current check-in timestamp (ms epoch)
 * @param {number} maxSpeedMs - Max plausible speed in m/s (default 300 = ~1080 km/h, above commercial flight ceiling)
 * @returns {string|null} reason if flagged, null if clean
 */
function checkVelocitySpoof(prevLat, prevLng, prevTimeMs, curLat, curLng, curTimeMs, maxSpeedMs = 300) {
  if (prevLat == null || prevLng == null) return null;
  if (typeof prevLat !== "number" || typeof prevLng !== "number") return null;
  if (typeof curLat !== "number" || typeof curLng !== "number") return null;

  const prevMs = typeof prevTimeMs === "string" ? Date.parse(prevTimeMs) : prevTimeMs;
  if (!prevMs || typeof prevMs !== "number") return null;

  const elapsedMs = curTimeMs - prevMs;
  if (elapsedMs <= 0) return null; // clock skew or same-tick, can't evaluate

  const distanceM = haversineMeters(prevLat, prevLng, curLat, curLng);
  const speedMs = distanceM / (elapsedMs / 1000);

  if (speedMs > maxSpeedMs) {
    return "velocity_spoof";
  }

  return null;
}

/**
 * @param {import("./supabase.js").SupabaseClient|null} supabaseAdmin
 * @param {number} submissionId
 * @param {string} reason
 * @param {Record<string, unknown>} [metadata]
 */
async function flagSubmission(supabaseAdmin, submissionId, reason, metadata = {}) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("submission_flags").insert({
    submission_id: submissionId,
    reason,
    metadata,
  });
}

export { checkGpsPlausibility, checkTimingAnomaly, checkVoteRing, checkVelocitySpoof, flagSubmission };