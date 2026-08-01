import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { resolveActiveTheme } from "../data/game.js";
import ThemeMotif from "./ui/ThemeMotif.jsx";

function revealKey(day) {
  return `lhs_theme_reveal_${day}`;
}

export default function ThemeReveal() {
  const { phase, currentDay, round } = useRound();
  const [showReveal, setShowReveal] = useState(false);
  const [revealed, setRevealed] = useState(null);

  const roundName = round?.name;
  const roundPrompt = round?.prompt;
  const roundCap = round?.survivalCap;

  useEffect(() => {
    if (phase !== "live" || !currentDay || !roundName) return undefined;

    try {
      if (localStorage.getItem(revealKey(currentDay)) === "1") return undefined;
    } catch {
      /* private browsing — still show once this mount */
    }

    const theme = resolveActiveTheme({
      name: roundName,
      placeType: round?.placeType,
      prompt: roundPrompt,
      survivalCap: roundCap,
    });
    setRevealed({
      day: currentDay,
      theme: theme.theme,
      emoji: theme.emoji,
      description: theme.description || roundPrompt || "Snap your proof. Be fast. Be real.",
      cap: roundCap ?? null,
    });
    setShowReveal(true);
    try {
      localStorage.setItem(revealKey(currentDay), "1");
    } catch {
      /* ignore */
    }
    const timer = setTimeout(() => setShowReveal(false), 3000);
    return () => clearTimeout(timer);
  }, [phase, currentDay, roundName, roundPrompt, roundCap, round?.placeType]);

  return (
    <AnimatePresence>
      {showReveal && revealed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-smoke/95 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label={`Day ${revealed.day} theme: ${revealed.theme}`}
        >
          <div className="text-center px-6">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <p className="font-mono text-neon text-xs uppercase tracking-widest mb-4">
                Day {revealed.day} · theme reveal
              </p>
              <div className="mb-6">
                <ThemeMotif emoji={revealed.emoji} size={120} label={revealed.theme} />
              </div>
              <p className="font-display text-4xl text-bone mb-3">
                {revealed.theme}
              </p>
              <p className="text-dim text-sm max-w-xs mx-auto">
                {revealed.description}
              </p>
              {revealed.cap != null && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.3 }}
                  className="mt-6 text-neon font-mono text-xs"
                >
                  Survival cap: {revealed.cap}
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
