import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import useReturnExperience from "../hooks/useReturnExperience.js";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate.js";
import { useQueuedCheckinFeedback } from "../hooks/useQueuedCheckinFeedback.js";
import { formatEliminationReason } from "../lib/eliminationReason.js";
import { useDelight } from "./DelightProvider.jsx";
import { haptic } from "../lib/haptics.js";
import { GameCta } from "./ui/CraftCta.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import OverlayPortal from "./OverlayPortal.jsx";
import { MOTION_SPRING } from "../lib/motion.js";

/**
 * ReturnExperience — mount-once overlays for the return moment (see the
 * return-experience pass):
 *
 *   1. Session-expired toast: a returning user whose 7-day session lapsed
 *      gets a one-line explanation instead of silently landing in onboarding.
 *   2. Elimination discovery: a player who was ALIVE last time and is now
 *      ELIMINATED gets a brief themed reveal explaining why + a CTA into the
 *      jury role.
 *   3. While-you-were-away catch-up toast: round advanced between visits.
 *
 * Mounted once at the App level so the beats show regardless of which screen
 * a returning user lands on. All dismissable; non-blocking.
 */
export default function ReturnExperience({ onCheckIn }) {
  const { you, phase, round, currentDay, isLoading, isReady, winner, nextCohort } = useRound();
  const { sessionExpired, clearSessionExpired } = useWorld();
  const { eliminatedWhileAway, daysAway, missedDays, phaseEndedWhileAway, dismiss } =
    useReturnExperience();
  const { updateReady, dismiss: dismissUpdate, refresh } = useServiceWorkerUpdate();
  const { replayResult, clear: clearReplay } = useQueuedCheckinFeedback();
  const { playSound } = useDelight();

  // Delight grammar for the emotional beats — matches verify/enter/speedrun
  // (playSound('victory') + celebrate/haptic on trust upgrades). The return
  // overlays previously fired silently; each fires its cue exactly once,
  // right when the beat first becomes visible.
  const elimCueFiredRef = useRef(false);
  useEffect(() => {
    if (!eliminatedWhileAway || elimCueFiredRef.current) return;
    elimCueFiredRef.current = true;
    playSound?.("error");
    haptic("warning");
  }, [eliminatedWhileAway, playSound]);

  const endedCueFiredRef = useRef(false);
  useEffect(() => {
    if (!phaseEndedWhileAway || eliminatedWhileAway || endedCueFiredRef.current) return;
    endedCueFiredRef.current = true;
    playSound?.("victory");
  }, [phaseEndedWhileAway, eliminatedWhileAway, playSound]);

  // Session-expired toast state (auto-dismiss after a beat).
  const [showSessionToast, setShowSessionToast] = useState(false);
  useEffect(() => {
    if (!sessionExpired) return;
    setShowSessionToast(true);
    const t = setTimeout(() => {
      setShowSessionToast(false);
      clearSessionExpired();
    }, 6000);
    return () => clearTimeout(t);
  }, [sessionExpired, clearSessionExpired]);
  const closeSessionToast = () => {
    setShowSessionToast(false);
    clearSessionExpired();
  };

  // #5 Stale-state flash — a subtle "Syncing…" pill while the first game-state
  // fetch is in flight, so a stale cached render reads as "about to update",
  // not "this is the truth".
  const showSyncing = isLoading && !isReady;

  // #6 Offline queue replay feedback — auto-dismiss the toast after a beat.
  const [showReplayToast, setShowReplayToast] = useState(false);
  useEffect(() => {
    if (!replayResult) return;
    setShowReplayToast(true);
    haptic(replayResult.ok ? "success" : "warning");
    const t = setTimeout(() => {
      setShowReplayToast(false);
      clearReplay();
    }, 6000);
    return () => clearTimeout(t);
  }, [replayResult, clearReplay]);
  const closeReplayToast = () => {
    setShowReplayToast(false);
    clearReplay();
  };

  // #3 Check-in urgency — recompute once a minute so the countdown stays live.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const opensMs = round?.opensAt ? Date.parse(round.opensAt) : null;
  const closesMs = round?.closesAt ? Date.parse(round.closesAt) : null;
  // Only a real authenticated player gets the urgency banner — a visitor
  // (isAuthed false) must never see "you haven't submitted".
  const isLiveAlive =
    phase === "live" &&
    Boolean(you?.isAuthed) &&
    !you?.isEliminated &&
    !you?.checkedInToday;
  const [urgencyDismissed, setUrgencyDismissed] = useState(false);
  const dismissUrgency = () => setUrgencyDismissed(true);
  const windowOpen = !urgencyDismissed && isLiveAlive && opensMs != null && closesMs != null && nowMs >= opensMs && nowMs <= closesMs;
  const windowMissed = !urgencyDismissed && isLiveAlive && closesMs != null && nowMs > closesMs;
  const msLeft = closesMs != null ? Math.max(0, closesMs - nowMs) : null;
  const closingSoon = msLeft != null && msLeft < 6 * 60 * 60 * 1000; // 6h

  // One light haptic when the urgency banner first appears, one firmer
  // buzz when it flips into "closing soon" — echoes the vibration cadence
  // haptic() already uses elsewhere (light/medium taps, not full alarms).
  const urgencyCueRef = useRef(null);
  useEffect(() => {
    if (!windowOpen) {
      urgencyCueRef.current = null;
      return;
    }
    const stage = closingSoon ? "closing" : "open";
    if (urgencyCueRef.current === stage) return;
    urgencyCueRef.current = stage;
    haptic(closingSoon ? "warning" : "light");
  }, [windowOpen, closingSoon]);

  const windowMissedCueFiredRef = useRef(false);
  useEffect(() => {
    if (!windowMissed) {
      windowMissedCueFiredRef.current = false;
      return;
    }
    if (windowMissedCueFiredRef.current) return;
    windowMissedCueFiredRef.current = true;
    haptic("error");
  }, [windowMissed]);

  const fmtLeft = () => {
    if (msLeft == null) return "…";
    const h = Math.floor(msLeft / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const elimination = eliminatedWhileAway
    ? formatEliminationReason(you?.eliminationReason)
    : null;
  const missedCopy =
    daysAway > 0
      ? missedDays.length > 0
        ? `You missed Day ${missedDays.join(" & ")}.`
        : daysAway === 1
          ? "You were away a day."
          : `You were away ${daysAway} days.`
      : null;

  // #7 Game ended — winner summary. Gate: never stack on the elimination
  // overlay (the emotional beat wins), and only when the user actually
  // experienced it as "while away" (a prev snapshot existed).
  const showEnded = phaseEndedWhileAway && !eliminatedWhileAway;
  const winnerLabel =
    winner?.address
      ? `${winner.address.slice(0, 6)}…${winner.address.slice(-4)}`
      : null;

  return (
    <>
      {/* 1. Session-expired toast */}
      {showSessionToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[55] animate-toast-down px-4"
          style={{ top: "calc(4.5rem + env(safe-area-inset-top, 0px))" }}
          role="status"
        >
          <div className="bg-smoke/95 backdrop-blur-md border border-amber/50 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-sm">
            <div className="w-2 h-2 bg-amber rounded-full animate-pulse" />
            <div className="min-w-0">
              <p className="text-bone text-sm font-body leading-snug">
                Session expired — sign in again to continue
              </p>
              <p className="text-dim text-[10px] font-mono mt-0.5">
                Your seat and progress are saved.
              </p>
            </div>
            <button
              type="button"
              onClick={closeSessionToast}
              aria-label="Dismiss"
              className="shrink-0 w-7 h-7 rounded-full bg-ash/80 border border-ember/40 text-dim hover:text-bone font-mono text-sm leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
{/* 5. Syncing pill — stale-state flash prevention (shows only during the
          first game-state fetch, so cached UI reads as "about to update"). */}
      {showSyncing && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[45] px-4 pointer-events-none"
          style={{ top: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
          role="status"
          aria-live="polite"
        >
          <div className="bg-smoke/90 backdrop-blur-md border border-ember/40 rounded-full px-3 py-1 shadow-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-amber/90 tracking-widest uppercase">Syncing…</span>
          </div>
        </div>
      )}

      {/* 3. Check-in urgency — window open & not checked in, or missed it */}
      {windowOpen && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[52] px-4 w-full max-w-sm"
          style={{ top: "calc(4.5rem + env(safe-area-inset-top, 0px))" }}
          role="alert"
        >
          <div className={`rounded-xl border px-3 py-2.5 shadow-2xl flex items-center gap-3 backdrop-blur-md ${closingSoon ? "bg-blood/25 border-blood/50" : "bg-amber/10 border-amber/50"}`}>
            <span className="text-lg" aria-hidden="true">{closingSoon ? "⏰" : "📸"}</span>
            <div className="min-w-0 flex-1">
              <p className={`font-mono text-xs font-semibold ${closingSoon ? "text-blood" : "text-amber"}`}>
                {closingSoon ? `Closes in ${fmtLeft()}` : `Check-in closes in ${fmtLeft()}`}
              </p>
              <p className="text-dim text-[10px] font-mono mt-0.5">
                You haven't submitted today's riddle yet.
              </p>
            </div>
            {typeof onCheckIn === "function" && (
              <button
                type="button"
                onClick={onCheckIn}
                className="shrink-0 bg-amber text-ash font-mono text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              >
                Check in →
              </button>
            )}
            <button
              type="button"
              onClick={dismissUrgency}
              aria-label="Dismiss"
              className="shrink-0 w-6 h-6 rounded-full bg-ash/60 border border-ember/30 text-dim hover:text-bone font-mono text-xs leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {windowMissed && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[52] px-4 w-full max-w-sm"
          style={{ top: "calc(4.5rem + env(safe-area-inset-top, 0px))" }}
          role="alert"
        >
          <div className="rounded-xl border border-blood/50 bg-blood/25 px-3 py-2.5 shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="text-lg" aria-hidden="true">⚰️</span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-semibold text-blood">You missed today's window</p>
              <p className="text-dim text-[10px] font-mono mt-0.5">
                Check-in closed. Survival is decided at cut — check the audit.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissUrgency}
              aria-label="Dismiss"
              className="shrink-0 w-6 h-6 rounded-full bg-ash/60 border border-ember/30 text-dim hover:text-bone font-mono text-xs leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 6. Offline queue replay feedback */}
      {showReplayToast && replayResult && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[55] animate-toast-down px-4"
          style={{ top: "calc(6.5rem + env(safe-area-inset-top, 0px))" }}
          role="status"
        >
          <div className={`bg-smoke/95 backdrop-blur-md border rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-sm ${replayResult.ok ? "border-neon/50" : "border-blood/50"}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${replayResult.ok ? "bg-neon" : "bg-blood"}`} />
            <div className="min-w-0">
              {replayResult.ok ? (
                <p className="text-bone text-sm font-body leading-snug">
                  Your offline check-in was submitted
                </p>
              ) : replayResult.nonReplayable > 0 ? (
                <p className="text-bone text-sm font-body leading-snug">
                  Your queued check-in expired — the window closed
                </p>
              ) : (
                <p className="text-bone text-sm font-body leading-snug">
                  Offline check-in failed — check your connection
                </p>
              )}
              <p className="text-dim text-[10px] font-mono mt-0.5">Day {currentDay ?? "—"} · submitted via queue</p>
            </div>
            <button
              type="button"
              onClick={closeReplayToast}
              aria-label="Dismiss"
              className="shrink-0 w-7 h-7 rounded-full bg-ash/80 border border-ember/40 text-dim hover:text-bone font-mono text-sm leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* 2. Elimination discovery — happened while they were away */}
      <AnimatePresence>
        {eliminatedWhileAway && (
          <OverlayPortal>
            <motion.div
              key="return-elim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 0%, rgba(74,40,33,0.96) 0%, rgba(22,16,12,0.98) 55%, rgba(13,13,13,0.99) 100%)",
                paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
                paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12 }}
                transition={MOTION_SPRING.snappy}
                className="w-full max-w-sm text-center"
              >
                <p className="font-mono text-blood/80 uppercase mb-3" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
                  While you were away
                </p>
                <p className="font-display text-4xl text-bone leading-none mb-4">
                  {elimination?.title ?? "Eliminated"}
                </p>
                <div className="mb-5 flex justify-center">
                  <MascotGuide
                    variant="sad"
                    size={64}
                    message="You're out of the race — but you're the jury now."
                    position="top"
                  />
                </div>
                <div className="rounded-2xl border border-ember/30 bg-smoke/50 p-4 mb-5 text-left">
                  {elimination?.body && (
                    <p className="font-body text-bone/80 text-sm leading-relaxed">
                      {elimination.body}
                    </p>
                  )}
                  {elimination?.hint && (
                    <p className="font-mono text-dim text-[10px] leading-relaxed mt-2">
                      {elimination.hint}
                    </p>
                  )}
                </div>
                <GameCta tone="neon" onClick={dismiss} className="w-full">
                  Open the audit →
                </GameCta>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-3 font-mono text-[10px] text-dim/70 underline decoration-dotted underline-offset-2"
                >
                  Dismiss
                </button>
              </motion.div>
            </motion.div>
          </OverlayPortal>
        )}
        {/* 3. While-you-were-away catch-up toast — survivors who missed days */}
        {missedCopy && !eliminatedWhileAway && (
          <motion.div
            key="return-away"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 -translate-x-1/2 z-[55] px-4"
            style={{ top: "calc(4.5rem + env(safe-area-inset-top, 0px))" }}
            role="status"
          >
            <div className="bg-smoke/95 backdrop-blur-md border border-amber/50 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-sm">
              <span className="text-lg" aria-hidden="true">🗓️</span>
              <div className="min-w-0">
                <p className="text-bone text-sm font-body leading-snug">
                  {missedCopy} You're still in. Welcome back.
                </p>
                <p className="text-dim text-[10px] font-mono mt-0.5">
                  Check the audit to catch up on what happened.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 w-7 h-7 rounded-full bg-ash/80 border border-ember/40 text-dim hover:text-bone font-mono text-sm leading-none"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
{/* 7. Game-ended while away — winner + next cohort */}
        {showEnded && (
          <OverlayPortal>
            <motion.div
              key="return-ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 0%, rgba(54,50,33,0.96) 0%, rgba(20,16,12,0.98) 55%, rgba(13,13,13,0.99) 100%)",
                paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
                paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12 }}
                transition={MOTION_SPRING.snappy}
                className="w-full max-w-sm text-center"
              >
                <p className="font-mono text-amber/80 uppercase mb-3" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
                  The game has ended
                </p>
                <p className="text-4xl mb-4" aria-hidden="true">🏆</p>
                <p className="font-display text-3xl text-bone leading-none mb-4">
                  {winnerLabel ? `Winner: ${winnerLabel}` : "One human took the pot"}
                </p>
                <p className="font-body text-bone/70 text-sm leading-relaxed mb-5">
                  While you were away, the last human standing was crowned. The
                  next cohort opens soon — reserve your seat when it does.
                </p>
                {nextCohort?.launchAt && (
                  <p className="font-mono text-dim text-[10px] mb-5 tracking-wide">
                    Cohort {nextCohort?.number ?? "next"} · opens{" "}
                    {new Date(nextCohort.launchAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                )}
                <GameCta tone="neon" onClick={dismiss} className="w-full">
                  See the finale →
                </GameCta>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-3 font-mono text-[10px] text-dim/70 underline decoration-dotted underline-offset-2"
                >
                  Dismiss
                </button>
              </motion.div>
            </motion.div>
          </OverlayPortal>
        )}

        {/* 8. App-update prompt — new SW took control, refresh to be sure */}
        {updateReady && (
          <motion.div
            key="app-update"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 -translate-x-1/2 z-[58] px-4"
            style={{ bottom: "calc(max(5.25rem, 4.5rem) + env(safe-area-inset-bottom, 0px))" }}
            role="status"
          >
            <div className="bg-smoke/95 backdrop-blur-md border border-amber/50 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-sm">
              <div className="min-w-0">
                <p className="text-bone text-sm font-body leading-snug">New version available</p>
                <p className="text-dim text-[10px] font-mono mt-0.5">Refresh to pick up the latest.</p>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="shrink-0 bg-amber text-ash font-mono text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                aria-label="Dismiss"
                className="shrink-0 w-7 h-7 rounded-full bg-ash/80 border border-ember/40 text-dim hover:text-bone font-mono text-sm leading-none"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}