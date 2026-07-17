import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { COHORT_SCHEDULE } from "../data/game.js";
import ThemeMotif from "./ui/ThemeMotif.jsx";

export default function ThemeReveal() {
  const { phase, currentDay } = useRound();
  const [showReveal, setShowReveal] = useState(false);
  const [revealedDay, setRevealedDay] = useState(null);

  useEffect(() => {
    if (phase === "live" && currentDay) {
      const dayTheme = COHORT_SCHEDULE.find(d => d.day === currentDay);
      if (dayTheme) {
        setRevealedDay(dayTheme);
        // Show reveal animation for 3 seconds
        setShowReveal(true);
        const timer = setTimeout(() => setShowReveal(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentDay]);

  return (
    <AnimatePresence>
      {showReveal && revealedDay && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-smoke/95 backdrop-blur-sm"
        >
          <div className="text-center">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <p className="font-mono text-neon text-xs uppercase tracking-widest mb-4">
                Day {revealedDay.day} · {revealedDay.dayLabel}
              </p>
              <div className="mb-6">
                <ThemeMotif emoji={revealedDay.emoji} size={120} label={revealedDay.theme} />
              </div>
              <p className="font-display text-4xl text-bone mb-3">
                {revealedDay.theme}
              </p>
              <p className="text-dim text-sm max-w-xs mx-auto">
                {revealedDay.description}
              </p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="mt-6 text-neon font-mono text-xs"
              >
                Survival cap: {revealedDay.cap}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
