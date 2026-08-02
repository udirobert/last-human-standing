/**
 * Pilot funnel events — the measurement spine for the Cohort 1 pilot.
 *
 * Page views alone can't distinguish rule confusion, verification
 * friction, submission friction, or weak return motivation. This helper
 * fires the 11-event funnel through the existing anonymous /api/track
 * pipe (rate-limited server-side, no PII):
 *
 *   landing_view → reserve_click → verification_started → wallet_connected → humanity_verified →
 *   checkin_opened → photo_added → submitted → votes_completed →
 *   verdict_seen → shared → returned_next_day
 *
 * Fire-and-forget: never throws, never blocks the UI, never retries.
 * sendBeacon is used where possible so events survive navigation/unload.
 */

const EVENT_ALLOWLIST = new Set([
  "landing_view",
  "reserve_click",
  "verification_started",
  "wallet_connected",
  "humanity_verified",
  "checkin_opened",
  "photo_added",
  "submitted",
  "votes_completed",
  "verdict_seen",
  "shared",
  "returned_next_day",
]);

/**
 * @param {string} event One of the allowlisted funnel event names.
 * @param {{ day?: number|string|null, value?: string, path?: string }} [opts]
 */
export function track(event, { day = null, value = null, path = null } = {}) {
  if (typeof window === "undefined") return;
  if (!EVENT_ALLOWLIST.has(event)) return;

  const body = JSON.stringify({
    event,
    day: day != null ? Number(day) : null,
    value: value != null ? String(value).slice(0, 200) : null,
    path: path ?? `${window.location.pathname}${window.location.search}`,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/track", blob)) return;
    }
    fetch("/api/track", { method: "POST", body, keepalive: true, credentials: "include" }).catch(() => {});
  } catch {
    // best-effort — the funnel must never break the game
  }
}
