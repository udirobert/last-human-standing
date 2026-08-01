/** One-shot handoff so Survive → Feed can open on unfinished proofs. */
export const FEED_INTENT_KEY = "lhs_feed_intent";

export function setFeedIntent({ filter } = {}) {
  if (!filter) return;
  try {
    sessionStorage.setItem(FEED_INTENT_KEY, JSON.stringify({ filter }));
  } catch {
    /* private mode */
  }
}

/** Read and clear pending feed intent (if any). */
export function consumeFeedIntent() {
  try {
    const raw = sessionStorage.getItem(FEED_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FEED_INTENT_KEY);
    const parsed = JSON.parse(raw);
    if (parsed?.filter && typeof parsed.filter === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
