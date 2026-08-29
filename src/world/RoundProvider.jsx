import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useWorld } from "./WorldProvider.jsx";

export const RoundContext = createContext(null);
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
  checkinStreak: 0,
  eliminationReason: null,
};
const DEFAULT_AGENTS = {
  enabled: false,
  maxRatio: 0.25,
  minCount: 5,
  maxSlots: 0,
  agentCount: 0,
  humanCount: 0,
  humanSlots: 50,
  slotsRemaining: { humans: 50, agents: 0 },
};

// Server-authoritative pilot posture (docs/COHORT1_PILOT.md). Defaults are
// the pilot's: free, verified-human, with paid entry / lottery / infiltrator /
// revival all disabled. The server overrides these via /api/game/state.pilot.
const DEFAULT_PILOT = {
  freeEntryMode: true,
  paidEntryEnabled: false,
  lotteryEnabled: false,
  infiltratorEnabled: false,
  revivalEnabled: false,
  requireHumanityForPlay: true,
};

const DEFAULT_STATE = {
  phase: "prelaunch",
  launchAt: null,
  nextCohort: { number: 2, launchAt: null },
  cohortSize: 50,
  reservedCount: 0,
  cohortFull: false,
  cohort: { size: 50, paidSlots: 25, freeSlots: 25, paidCount: 0, freeCount: 0 },
  agents: DEFAULT_AGENTS,
  silentVerification: false,
  pilot: DEFAULT_PILOT,
  currentDay: null,
  round: null,
  you: DEFAULT_YOU,
  winner: null,
  payout: null,
  breakdown: null,
  lastDayClose: null,
  defaults: { survivalCap: 25, radiusM: 100 },
  commitReveal: { enabled: false },
  verification: {
    voteQuorum: 25,
    voteQuorumNormal: 25,
    voteQuorumLow: 10,
    voteQuorumReason: "normal",
    realPctToVerify: 0.7,
    fakePctToFlag: 0.3,
  },
};

function normalizeGameState(data) {
  return {
    phase: data.phase ?? "prelaunch",
    launchAt: data.launchAt ?? null,
    nextCohort: data.nextCohort ?? { number: 2, launchAt: null },
    cohortSize: data.cohortSize ?? 50,
    reservedCount: data.reservedCount ?? 0,
    cohortFull: Boolean(data.cohortFull),
    cohort: data.cohort ?? { size: 50, paidSlots: 25, freeSlots: 25, paidCount: 0, freeCount: 0 },
    agents: { ...DEFAULT_AGENTS, ...(data.agents ?? {}) },
    silentVerification: Boolean(data.silentVerification),
    pilot: { ...DEFAULT_PILOT, ...(data.pilot ?? {}) },
    currentDay: data.currentDay ?? null,
    round: data.round ?? null,
    you: { ...DEFAULT_YOU, ...(data.you ?? {}) },
    winner: data.winner ?? null,
    payout: data.payout ?? null,
    breakdown: data.breakdown ?? null,
    lastDayClose: data.lastDayClose ?? null,
    defaults: { ...DEFAULT_STATE.defaults, ...(data.defaults ?? {}) },
    commitReveal: data.commitReveal ?? { enabled: false },
    verification: { ...DEFAULT_STATE.verification, ...(data.verification ?? {}) },
  };
}

export function RoundProvider({ children }) {
  const { installAttempted } = useWorld();
  const [state, setState] = useState(DEFAULT_STATE);
  // The /api/game/state response is normalized before comparing, so an
  // unchanged poll does not fan out a new context value to every useRound()
  // consumer. JSON is safe here: this is a plain API payload (no functions,
  // dates, maps, or cycles) and the normalized field order is stable.
  const stateFingerprintRef = useRef(JSON.stringify(DEFAULT_STATE));
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
        const nextState = normalizeGameState(data);
        const nextFingerprint = JSON.stringify(nextState);
        if (stateFingerprintRef.current !== nextFingerprint) {
          stateFingerprintRef.current = nextFingerprint;
          setState(nextState);
          // This tracks the last meaningful game-state change; updating it on
          // every identical poll would still re-render every useRound consumer.
          setLastUpdatedAt(Date.now());
        }
        setStatus("ready");
        setUsesDemoState(false);
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

    const isVisible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const scheduleNext = (ok) => {
      if (cancelled) return;
      // Don't schedule while hidden — the visibilitychange handler resumes
      // (with an immediate catch-up fetch) when the tab is foregrounded again.
      if (!isVisible()) return;
      // 15s when healthy, 60s after 2+ consecutive failures
      const delay = ok || consecutiveFailures < 2 ? 15_000 : 60_000;
      timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      // A visibility resume can happen while the prior fetch is still
      // completing. Let that fetch schedule the next tick instead of creating
      // two concurrent timers.
      if (inFlight) return;
      timer = null;
      const ok = await load({ silent: true });
      if (cancelled) return;
      scheduleNext(ok);
    };

    const onVisibility = () => {
      if (cancelled) return;
      if (isVisible()) {
        // Resume: catch up immediately, then re-arm the timer.
        if (timer == null) tick();
      } else if (timer) {
        // Pause: stop polling a backgrounded tab.
        clearTimeout(timer);
        timer = null;
      }
    };

    load().then(scheduleNext);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      timer = null;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
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
