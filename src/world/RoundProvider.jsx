import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useWorld } from "./WorldProvider.jsx";

const RoundContext = createContext(null);

const DEFAULT_STATE = {
  phase: "prelaunch",          // 'prelaunch' | 'live' | 'ended'
  launchAt: null,
  cohortSize: 50,
  reservedCount: 0,
  cohortFull: false,
  currentDay: null,
  round: null,                 // { day, name, prompt, lat, lng, radiusM, survivalCap, opensAt, closesAt, status, checkinCount, slotsRemaining }
  you: {
    isAuthed: false,
    isPaid: false,
    isEliminated: false,
    eliminatedAtDay: null,
    checkedInToday: false,
    rankToday: null,
    survivedToday: null,
    distanceToday: null,
  },
  defaults: { survivalCap: 25, radiusM: 100 },
  // Audit defaults (non-binding in pilot — kept for Feed UI compatibility)
  verification: {
    voteQuorum: 25,
    voteQuorumNormal: 25,
    voteQuorumLow: 10,
    voteQuorumReason: "normal",
    realPctToVerify: 0.7,
    fakePctToFlag: 0.3,
  },
};

export function RoundProvider({ children }) {
  const { installAttempted } = useWorld();

  const [state, setState] = useState(DEFAULT_STATE);
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
        const resp = await fetch("/api/game/state", { credentials: "include" });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        if (cancelled) return;
        setState({
          phase: data.phase ?? "prelaunch",
          launchAt: data.launchAt ?? null,
          cohortSize: data.cohortSize ?? 50,
          reservedCount: data.reservedCount ?? 0,
          cohortFull: Boolean(data.cohortFull),
          currentDay: data.currentDay ?? null,
          round: data.round ?? null,
          you: { ...DEFAULT_STATE.you, ...(data.you ?? {}) },
          defaults: { ...DEFAULT_STATE.defaults, ...(data.defaults ?? {}) },
        });
        setStatus("ready");
        setLastUpdatedAt(Date.now());
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Failed to load game state");
      }
    };

    load();
    const interval = setInterval(() => load({ silent: true }), 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [installAttempted, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const value = useMemo(
    () => ({
      ...state,
      status,
      error,
      isLoading: status === "loading",
      isReady: status === "ready",
      isError: status === "error",
      lastUpdatedAt,
      refresh,
    }),
    [state, status, error, lastUpdatedAt, refresh],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound() {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error("useRound must be used within <RoundProvider />");
  return ctx;
}
