import { useState, useEffect } from "react";

export function useStats({ pollMs = 60_000 } = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resp = await fetch("/api/stats");
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled) setStats(data);
      } catch {
        // silently keep stale data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);

  return { stats, loading };
}
