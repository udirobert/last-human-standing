import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * One-shot celebration confetti for Onboarding step 3 ("YOU'RE IN").
 * Renders a screen-spanning burst of colored particles + radial
 * ring expansion. Auto-cleans after 1.5s.
 *
 * Designed to be the "this is a real moment" beat. Distinct from
 * the Mascot's tap-confetti (which is interactive).
 */
export default function StepThreeConfetti() {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setActive(false), 1800);
    return () => clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {/* Central radial wave */}
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blood"
          />

          {/* Confetti particles — 36 deterministic positions */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i / 36) * Math.PI * 2;
            const dist = 100 + (i * 11) % 180;
            const color = ["#FFB800", "#FF1A1A", "#00FF94", "#00C8FF", "#FFFFFF"][i % 5];
            const icon = ["✨", "⭐", "💫", "🔥", "⚡", "🌟"][i % 6];
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist - 30,
                  opacity: 0,
                  scale: 1,
                  rotate: ((i * 47) % 360) - 180,
                }}
                transition={{ duration: 1.0 + (i % 3) * 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="absolute top-1/2 left-1/2 text-lg"
                style={{ color }}
              >
                {icon}
              </motion.span>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
