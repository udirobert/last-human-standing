import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Generic polling hook — single source of truth for fetch + interval + cleanup.
 * @param {string|null} url        — endpoint to poll (null to skip)
 * @param {object}      [opts]
 * @param {number}      [opts.intervalMs=15000]
 * @param {function}    [opts.transform]  — (json) => value to store
 * @param {*}           [opts.initial]    — initial state before first fetch
 * @param {object}      [opts.fetchOpts]  — extra options for fetch()
 * @param {Array}       [opts.deps]       — extra deps to re-trigger polling
 */
export function usePolling(url, {
  intervalMs = 15_000,
  transform,
  initial = null,
  fetchOpts = { credentials: "include" },
  deps = [],
} = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!url);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const resp = await fetch(url, fetchOpts);
      if (!resp.ok) return;
      const json = await resp.json();
      setData(transformRef.current ? transformRef.current(json) : json);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [url, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!url) { setLoading(false); return; }
    let cancelled = false;
    const wrapped = async () => {
      await load();
      if (cancelled) return;
    };
    wrapped();
    const id = setInterval(wrapped, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [load, intervalMs]);

  return { data, loading, refetch: load };
}
