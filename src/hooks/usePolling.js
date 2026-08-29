import { useCallback, useEffect, useState } from "react";

/**
 * Generic polling hook — single source of truth for fetch + interval + cleanup.
 * Pauses while the tab is backgrounded to save battery and server load.
 */
export function usePolling(url, {
  intervalMs = 15_000,
  transform,
  initial = null,
  fetchOpts = { credentials: "include" },
  deps = [],
} = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(Boolean(url));
  // Serialize deps to a stable primitive so load() only changes identity
  // when a dep's VALUE changes, not merely because callers pass a fresh
  // array literal each render.
  const depsKey = JSON.stringify(deps);

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const resp = await fetch(url, fetchOpts);
      if (!resp.ok) return;
      const json = await resp.json();
      setData(transform ? transform(json) : json);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
    // depsKey (not deps) is the real dependency — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fetchOpts, transform, depsKey]);

  useEffect(() => {
    if (!url) return;

    let intervalId = null;
    let visibilityHandler = null;

    const start = () => {
      if (intervalId != null) return;
      load();
      intervalId = setInterval(load, intervalMs);
    };

    const stop = () => {
      if (intervalId == null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      start();
    }
    // Backgrounded mount or SSR: defer start until visibilitychange.
    // `loading` defaults to Boolean(url) on mount, so the initial fetch
    // indicator is already shown without an extra setState.

    if (typeof document !== "undefined") {
      visibilityHandler = onVisibility;
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    return () => {
      stop();
      if (visibilityHandler && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, [url, intervalMs, load]);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    await load();
  }, [url, load]);

  return { data, loading, refetch };
}
