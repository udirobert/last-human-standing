import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";

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

  const dismiss = () => setShow(false);

  const survived = recapData?.survivors ?? "—";
  const eliminated = recapData?.eliminated ?? "—";
  const dq = recapData?.dq ?? "—";
  const remaining = recapData?.remaining ?? "—";
  const day = recapData?.day ?? "—";

  // Personal result
  const youSurvived = you?.survivedToday === true;
  const youEliminated = you?.isEliminated === true && you?.eliminatedAtDay === day;
  const personalResult = youSurvived ? "survived" : youEliminated ? "eliminated" : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-ash/95 backdrop-blur-md px-5"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="text-center"
          >
            <p className="font-mono text-dim text-sm tracking-widest uppercase mb-3">
              Day {day} Closed
            </p>
            <p className="font-display text-6xl text-bone leading-none mb-6 animate-glow">
              VERDICTS IN
            </p>

            {/* Personal result banner */}
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
                  {personalResult === "survived" ? "✅ YOU SURVIVED" : "💀 YOU WERE ELIMINATED"}
                </p>
              </motion.div>
            )}

            {/* Stats grid with real numbers */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <RecapStat icon="✅" label="Survived" value={survived} tone="neon" />
              <RecapStat icon="💀" label="Eliminated" value={eliminated} tone="blood" />
              <RecapStat icon="🚫" label="DQ'd" value={dq} tone="amber" />
            </div>

            {/* Remaining humans */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-bone font-mono text-sm mt-6"
            >
              <span className="font-display text-2xl text-amber">{remaining}</span> humans remain
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-dim font-mono text-xs mt-6"
            >
              Tap to continue
            </motion.p>
          </motion.div>

          <AutoDismiss onDismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RecapStat({ icon, label, value, tone }) {
  const color =
    tone === "neon" ? "text-neon" :
    tone === "blood" ? "text-blood" :
    "text-amber";
  return (
    <div className="bg-smoke/60 border border-ember/40 rounded-xl p-3">
      <p className="text-2xl mb-1">{icon}</p>
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
