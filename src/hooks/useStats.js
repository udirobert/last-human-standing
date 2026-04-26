import { usePolling } from "./usePolling.js";

export function useStats({ pollMs = 60_000 } = {}) {
  const { data: stats, loading } = usePolling("/api/stats", {
    intervalMs: pollMs,
  });

  return { stats, loading };
}
