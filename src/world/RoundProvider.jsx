import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useWorld } from "./WorldProvider.jsx";

const RoundContext = createContext(null);
const DEFAULT_YOU = {
  isAuthed: false,
  isPaid: false,
  isEliminated: false,
  eliminatedAtDay: null,
  checkedInToday: false,
  rankToday: null,
  survivedToday: null,
  distanceToday: null,
  juryTickets: 0,
  isJury: false,
  juryWeight: 1,
  voteAccuracy: null,
  votesCorrect: 0,
  votesResolved: 0,
};
const DEFAULT_STATE = {
  phase: "prelaunch",
  launchAt: null,
  cohortSize: 50,
  reservedCount: 0,
  cohortFull: false,
  cohort: { size: 50, paidSlots: 25, freeSlots: 25, paidCount: 0, freeCount: 0 },
  currentDay: null,
  round: null,
  you: DEFAULT_YOU,
  winner: null,
  defaults: { survivalCap: 25, radiusM: 100 },
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
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [usesDemoState, setUsesDemoState] = useState(false);

  useEffect(() => {
    if (!installAttempted) return;

    let cancelled = false;
    let consecutiveFailures = 0;
    let inFlight = false;
    let timer = null;

    const load = async ({ silent = false } = {}) => {
      if (inFlight) return false;
      inFlight = true;
      if (!silent) setStatus("loading");
      setError(null);
      try {
        const resp = await fetch("/api/game/state", { credentials: "include" });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        if (cancelled) return true;
        setState({
          phase: data.phase ?? "prelaunch",
          launchAt: data.launchAt ?? null,
          cohortSize: data.cohortSize ?? 50,
          reservedCount: data.reservedCount ?? 0,
          cohortFull: Boolean(data.cohortFull),
          cohort: data.cohort ?? { size: 50, paidSlots: 25, freeSlots: 25, paidCount: 0, freeCount: 0 },
          currentDay: data.currentDay ?? null,
          round: data.round ?? null,
          you: { ...DEFAULT_YOU, ...(data.you ?? {}) },
          winner: data.winner ?? null,
          defaults: { ...DEFAULT_STATE.defaults, ...(data.defaults ?? {}) },
          verification: { ...DEFAULT_STATE.verification, ...(data.verification ?? {}) },
        });
        setStatus("ready");
        setUsesDemoState(false);
        setLastUpdatedAt(Date.now());
        consecutiveFailures = 0;
        return true;
      } catch (e) {
        if (cancelled) return false;
        setStatus("ready");
        setUsesDemoState(true);
        setError(e instanceof Error ? e.message : "Failed to load game state");
        consecutiveFailures += 1;
        return false;
      } finally {
        inFlight = false;
      }
    };

    const tick = async () => {
      const ok = await load({ silent: true });
      if (cancelled) return;
      // 15s when healthy, 60s after 2+ consecutive failures
      const delay = ok || consecutiveFailures < 2 ? 15_000 : 60_000;
      timer = setTimeout(tick, delay);
    };

    load().then((ok) => {
      if (cancelled) return;
      const delay = ok || consecutiveFailures < 2 ? 15_000 : 60_000;
      timer = setTimeout(tick, delay);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
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
      // Phase flags — single source of truth for every consumer.
      isPrelaunch: state.phase === "prelaunch",
      isLive: state.phase === "live",
      isEnded: state.phase === "ended",
      usesDemoState,
      lastUpdatedAt,
      refresh,
    }),
    [state, status, error, usesDemoState, lastUpdatedAt, refresh],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound() {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error("useRound must be used within <RoundProvider />");
  return ctx;
}
