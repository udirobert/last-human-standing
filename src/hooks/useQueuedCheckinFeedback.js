import { useCallback, useEffect, useState } from "react";

/**
 * useQueuedCheckinFeedback — listens for the service worker's QUEUE_REPLAYED
 * message (posted after an offline check-in is replayed via background sync
 * or REPLAY_QUEUE_NOW) and surfaces the outcome so the user isn't left
 * guessing whether their queued check-in went through.
 *
 * see public/sw.js replayQueue() → { type: "QUEUE_REPLAYED", results }.
 *
 * @returns {{
 *   replayResult: { ok: boolean, failedCount: number, nonCeased: number } | null,
 *   clear: () => void,
 * }}
 */
export function useQueuedCheckinFeedback() {
  const [replayResult, setReplayResult] = useState(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }
    const handler = (event) => {
      if (event?.data?.type !== "QUEUE_REPLAYED") return;
      const results = Array.isArray(event.data.results) ? event.data.results : [];
      const failed = results.filter((r) => r && !r.ok);
      if (results.length === 0) return; // nothing replayed — nothing to say
      setReplayResult({
        ok: failed.length === 0,
        failedCount: failed.length,
        // A 4xx on replay (e.g. window closed) needs a different message
        // than a transient network failure.
        nonReplayable: failed.filter((r) => r.status >= 400 && r.status < 500).length,
      });
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const clear = useCallback(() => setReplayResult(null), []);

  return { replayResult, clear };
}

export default useQueuedCheckinFeedback;