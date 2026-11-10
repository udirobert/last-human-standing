/**
 * Market catalog plates — generated museum-specimen art for listings.
 * POST /api/v3/market/art → poll → signed URL. Cached server-side by
 * item label, so repeat views are free. Returns null on any failure.
 */

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {{ itemKind: string, itemRef?: string }} item
 * @returns {Promise<string|null>} signed URL of the catalog plate, or null
 */
export async function getMarketArtUrl({ itemKind, itemRef } = {}) {
  try {
    if (!itemKind) return null;
    const createResp = await fetch("/api/v3/market/art", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ itemKind, itemRef }),
    });
    const created = await createResp.json().catch(() => ({}));
    if (!createResp.ok || !created.ok) return null;
    if (created.url) return created.url;
    if (!created.taskId) return null;

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      const pollResp = await fetch(`/api/v3/market/art/${encodeURIComponent(created.taskId)}`, {
        credentials: "include",
      });
      const poll = await pollResp.json().catch(() => ({}));
      if (poll.status === "done" && poll.url) return poll.url;
      if (poll.status === "failed" || !pollResp.ok) return null;
    }
    return null;
  } catch {
    return null;
  }
}
