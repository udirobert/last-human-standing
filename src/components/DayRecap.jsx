import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { getDayRecapMascot, dayRecapContinueLabel } from "../lib/copy.js";
import { resolveTomorrow } from "../lib/tomorrow.js";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { HumanCta } from "./ui/CraftCta.jsx";
import { MOTION_DURATION, MOTION_EASE, MOTION_SPRING } from "../lib/motion.js";
import OverlayPortal from "./OverlayPortal.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

/**
 * DayRecap — a cinematic full-screen overlay shown when a day closes.
 *
 * Uses real stats from the game state (lastDayClose) to show:
 *   - "DAY X CLOSED" in large type
 *   - Real survived / eliminated / DQ'd counts
 *   - Remaining humans count
 *   - Personal result (did YOU survive?)
 *   - Auto-dismisses after 6s or on tap
 */
const RECAP_KEY = "lhs_day_recap_seen";

export default function DayRecap() {
  const { isLive, currentDay, lastDayClose, you } = useRound();
  const [show, setShow] = useState(false);
  const [recapData, setRecapData] = useState(null);

  useEffect(() => {
    if (!isLive || !lastDayClose) return;

    try {
      const seen = localStorage.getItem(RECAP_KEY);
      const seenDay = seen ? parseInt(seen, 10) : null;

      // Show recap if we haven't seen this day's close yet
      if (seenDay == null || seenDay < lastDayClose.day) {
        setRecapData(lastDayClose);
        setShow(true);
        localStorage.setItem(RECAP_KEY, String(lastDayClose.day));
      }
    } catch {
      // localStorage may be unavailable (private browsing)
    }
  }, [isLive, lastDayClose]);

  // Listen for push notifications about day closes
  useEffect(() => {
    const handler = (event) => {
      const data = event?.data || {};
      if (data.type === "verdict" || data.type === "day_closed") {
        if (data.day != null) {
          setRecapData({
            day: data.day,
            survivors: data.survivors ?? null,
            eliminated: data.eliminated ?? null,
            dq: data.dq ?? null,
            remaining: data.remaining ?? null,
          });
          setShow(true);
          try { localStorage.setItem(RECAP_KEY, String(data.day)); } catch { /* private browsing */ }
        }
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, []);

  const dismiss = useCallback(() => setShow(false), []);

  const survived = recapData?.survivors ?? "—";
  const eliminated = recapData?.eliminated ?? "—";
  const dq = recapData?.dq ?? "—";
  const remaining = recapData?.remaining ?? "—";
  const day = recapData?.day ?? "—";

  // Personal result
  const youSurvived = you?.survivedToday === true;
  const youEliminated = you?.isEliminated === true && you?.eliminatedAtDay === day;
  const personalResult = youSurvived ? "survived" : youEliminated ? "eliminated" : null;
  const recapMascot = getDayRecapMascot({ personalResult });
  const trapRef = useFocusTrap(show, { onEscape: dismiss });
  const tomorrow = resolveTomorrow(recapData?.day ?? currentDay, {
    remaining: recapData?.remaining,
  });
  const continueLabel = dayRecapContinueLabel({
    personalResult,
    currentDay: recapData?.day ?? currentDay,
    nextTheme: tomorrow?.theme ?? null,
  });

  return (
    <OverlayPortal>
    <AnimatePresence>
      {show && (
        <motion.div
          ref={trapRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Day recap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-5 overflow-y-auto overscroll-y-contain outline-none"
          style={{
            background: "radial-gradient(120% 90% at 50% 0%, rgba(74,50,33,0.97) 0%, rgba(22,16,12,0.98) 55%, rgba(13,13,13,0.99) 100%)",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
            paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={MOTION_SPRING.gentle}
            className="text-center w-full max-w-sm"
          >
            <p className="font-mono text-dim text-sm tracking-widest uppercase mb-3">
              Day {day} closed
            </p>
            <p className="font-display text-5xl text-bone leading-none mb-4 animate-glow">
              Verdicts in
            </p>
            <MotifFrieze className="w-full mb-5" />

            <div className="flex justify-center mb-5">
              <MascotGuide
                variant={recapMascot.variant}
                size={64}
                message={recapMascot.message}
                position="top"
              />
            </div>

            {personalResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`mb-6 inline-block px-4 py-2 rounded-full border ${
                  personalResult === "survived"
                    ? "bg-neon/10 border-neon/40 text-neon"
                    : "bg-blood/10 border-blood/40 text-blood"
                }`}
              >
                <p className="font-mono text-sm font-bold">
                  {personalResult === "survived" ? "You survived" : "You were eliminated"}
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <RecapStat label="Survived" value={survived} tone="neon" />
              <RecapStat label="Eliminated" value={eliminated} tone="blood" />
              <RecapStat label="DQ'd" value={dq} tone="amber" />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-bone font-body text-sm mt-6"
            >
              <span className="font-display text-2xl text-amber tabular-nums">{remaining}</span> humans remain
            </motion.p>

            {tomorrow && personalResult !== "eliminated" && (
              <p className="font-mono text-dim text-[10px] mt-4 tracking-wide">
                Theme waiting downstairs · {tomorrow.emoji} {tomorrow.theme}
              </p>
            )}

            <HumanCta onClick={dismiss} className="mt-6">
              {continueLabel}
            </HumanCta>
          </motion.div>

          <AutoDismiss onDismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
    </OverlayPortal>
  );
}

function RecapStat({ label, value, tone }) {
  const color =
    tone === "neon" ? "text-neon" :
    tone === "blood" ? "text-blood" :
    "text-amber";
  return (
    <div className="bg-smoke/60 border border-ember/40 rounded-xl p-3">
      <p className={`font-display text-2xl ${color} leading-none tabular-nums`}>{value}</p>
      <p className="text-dim text-[9px] font-mono uppercase mt-1">{label}</p>
    </div>
  );
}

function AutoDismiss({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return null;
}
