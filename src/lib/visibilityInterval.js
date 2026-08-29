/**
 * visibilityInterval — run a callback on an interval that PAUSES while the
 * tab is backgrounded (document.visibilityState !== "visible"), and resumes
 * — with an immediate catch-up run — when the tab becomes visible again.
 *
 * This is the shared primitive behind the hand-rolled poll loops
 * (RoundProvider, Feed, Chat) so a hidden tab stops hammering the server.
 * `usePolling` has its own equivalent; this exists for the imperative loops
 * that can't easily adopt that hook (custom cadence, backoff, etc.).
 *
 * @param {() => void} fn                 called on each tick (and on resume)
 * @param {number} intervalMs             tick cadence in ms
 * @param {object} [opts]
 * @param {boolean} [opts.runImmediately=true]  run fn() once on start
 * @returns {() => void}  teardown — clears the interval and removes listeners
 */
export function visibilityInterval(fn, intervalMs, { runImmediately = true } = {}) {
  let id = null;

  const isVisible = () =>
    typeof document === "undefined" || document.visibilityState === "visible";

  const start = () => {
    if (id != null) return;
    id = setInterval(fn, intervalMs);
  };

  const stop = () => {
    if (id == null) return;
    clearInterval(id);
    id = null;
  };

  const onVisibility = () => {
    if (isVisible()) {
      // Catch up immediately on resume so the user doesn't stare at stale
      // data for up to a full interval after refocusing.
      fn();
      start();
    } else {
      stop();
    }
  };

  if (isVisible()) {
    if (runImmediately) fn();
    start();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  return () => {
    stop();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

export default visibilityInterval;
