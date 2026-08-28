import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import useReturnExperience from "../hooks/useReturnExperience.js";
import { formatEliminationReason } from "../lib/eliminationReason.js";
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
export default function ReturnExperience() {
  const { you } = useRound();
  const { sessionExpired, clearSessionExpired } = useWorld();
  const { eliminatedWhileAway, daysAway, missedDays, dismiss } =
    useReturnExperience();

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
      </AnimatePresence>
    </>
  );
}