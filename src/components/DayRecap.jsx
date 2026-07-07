import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";

/**
 * DayRecap — a cinematic full-screen overlay shown when a day closes.
 *
 * Triggered when the game state detects a day transition (currentDay
 * changes or a "day_closed" push notification arrives). Shows:
 *   - "DAY X CLOSED" in large type
 *   - Survived / eliminated / DQ'd counts
 *   - Auto-dismisses after 4s or on tap
 *
 * This is the reality-show "previously on" beat that makes the
 * game feel like an event, not a form.
 */
const RECAP_KEY = "lhs_day_recap_seen";

export default function DayRecap() {
  const { phase, isLive, currentDay, round } = useRound();
  const [show, setShow] = useState(false);
  const [recapDay, setRecapDay] = useState(null);

  useEffect(() => {
    if (!isLive || currentDay == null) return;

    try {
      const seen = localStorage.getItem(RECAP_KEY);
      const seenDay = seen ? parseInt(seen, 10) : null;

      // Show recap if we haven't seen this day's close yet.
      // We detect a "closed" day by checking if the round's closes_at
      // has passed AND it's not the current open round.
      // The simplest signal: if currentDay advanced past what we've seen.
      if (seenDay != null && seenDay < currentDay) {
        // We jumped forward — show recap for the day that just closed
        setRecapDay(seenDay);
        setShow(true);
        localStorage.setItem(RECAP_KEY, String(currentDay));
      } else if (seenDay == null) {
        // First time seeing the live game — mark current day as seen
        localStorage.setItem(RECAP_KEY, String(currentDay));
      }
    } catch {
      // localStorage may be unavailable (private browsing)
    }
  }, [isLive, currentDay]);

  // Listen for push notifications about day closes
  useEffect(() => {
    const handler = (event) => {
      const data = event?.data || {};
      if (data.type === "day_closed" || data.type === "verdict_summary") {
        if (data.day != null) {
          setRecapDay(data.day);
          setShow(true);
          try { localStorage.setItem(RECAP_KEY, String(data.day + 1)); } catch { /* private browsing */ }
        }
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, []);

  const dismiss = () => setShow(false);

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
              Day {recapDay ?? "—"} Closed
            </p>
            <p className="font-display text-6xl text-bone leading-none mb-6 animate-glow">
              VERDICTS IN
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <RecapStat icon="✅" label="Survived" tone="neon" />
              <RecapStat icon="💀" label="Eliminated" tone="blood" />
              <RecapStat icon="🚫" label="DQ'd" tone="amber" />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-dim font-mono text-xs mt-8"
            >
              Tap to continue
            </motion.p>
          </motion.div>

          {/* Auto-dismiss after 5s */}
          <AutoDismiss onDismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RecapStat({ icon, label, tone }) {
  const color =
    tone === "neon" ? "text-neon" :
    tone === "blood" ? "text-blood" :
    "text-amber";
  return (
    <div className="bg-smoke/60 border border-ember/40 rounded-xl p-3">
      <p className="text-2xl mb-1">{icon}</p>
      <p className={`font-display text-2xl ${color} leading-none`}>—</p>
      <p className="text-dim text-[9px] font-mono uppercase mt-1">{label}</p>
    </div>
  );
}

function AutoDismiss({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return null;
}
