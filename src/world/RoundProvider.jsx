import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useWorld } from "./WorldProvider.jsx";

const RoundContext = createContext(null);

const DEFAULT_VERIFICATION = {
  voteQuorum: 25,
  voteQuorumNormal: 25,
  voteQuorumLow: 10,
  voteQuorumReason: "normal",
  realPctToVerify: 0.7,
  fakePctToFlag: 0.3,
};

export function RoundProvider({ children }) {
  const { installAttempted } = useWorld();

  const [round, setRound] = useState(null);
  const [verification, setVerification] = useState(DEFAULT_VERIFICATION);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!installAttempted) return;

    let cancelled = false;

    const load = async ({ silent = false } = {}) => {
      if (!silent) setStatus("loading");
      setError(null);
      try {
        const resp = await fetch("/api/round-status", { credentials: "include" });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        if (cancelled) return;
        setRound(data?.round ?? null);
        setVerification((v) => ({ ...v, ...(data?.verification ?? {}) }));
        setStatus("ready");
        setLastUpdatedAt(Date.now());
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Failed to load round status");
      }
    };

    load();
    const interval = setInterval(() => load({ silent: true }), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [installAttempted, refreshKey]);

  const value = useMemo(
    () => ({
      round,
      verification,
      status,
      error,
      isLoading: status === "loading",
      isReady: status === "ready",
      isError: status === "error",
      lastUpdatedAt,
      refresh: () => setRefreshKey((k) => k + 1),
    }),
    [round, verification, status, error, lastUpdatedAt],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound() {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error("useRound must be used within <RoundProvider />");
  return ctx;
}
