import { useCallback, useEffect, useState } from "react";

/**
 * Generic polling hook — single source of truth for fetch + interval + cleanup.
 */
export function usePolling(url, {
  intervalMs = 15_000,
  transform,
  initial = null,
  fetchOpts = { credentials: "include" },
} = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(Boolean(url));

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
  }, [url, fetchOpts, transform]);

  useEffect(() => {
    if (!url) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setLoading(true);
      load();
    }, 0);
    const intervalId = setInterval(load, intervalMs);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [url, intervalMs, load]);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    await load();
  }, [url, load]);

  return { data, loading, refetch };
}
