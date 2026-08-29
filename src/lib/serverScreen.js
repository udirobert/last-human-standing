/**
 * Server-side screen restore (return-experience item #9).
 *
 * In World App / Farcaster frames the host may kill and recreate the webview,
 * which can wipe localStorage. We mirror the user's last screen on the server
 * (users.last_screen) so position can be restored even when localStorage is
 * gone.
 *
 * Client flow:
 *   - saveServerScreen(): debounced PUT on navigation
 *   - fetchServerScreen(): GET /api/me → lastScreen, used only when
 *     localStorage has no screen state (wiped/embedded).
 */

const SCREEN_KEY = "lhs_screen_state_v1";

/** Read the local screen state, or null if absent/unparseable. */
export function readLocalScreenState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCREEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.screen === "string" ? parsed.screen : null;
  } catch {
    return null;
  }
}

/** Does this device already have local screen state? */
export function hasLocalScreenState() {
  return readLocalScreenState() != null;
}

/** GET /api/me → lastScreen, or null on failure/unauthenticated. */
export async function fetchServerScreen() {
  try {
    const resp = await fetch("/api/me", { credentials: "include" });
    if (!resp.ok) return null;
    const json = await resp.json();
    return typeof json?.lastScreen === "string" ? json.lastScreen : null;
  } catch {
    return null;
  }
}

/** PUT /api/me/last-screen — best-effort, never throws. */
export async function saveServerScreen(screen, navTab) {
  if (typeof screen !== "string" || !screen) return;
  try {
    await fetch("/api/me/last-screen", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ screen, navTab }),
    });
  } catch {
    /* best effort — local restore still works */
  }
}