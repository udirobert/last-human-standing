import { motion } from "framer-motion";

/**
 * Visual 4-step "how a day looks" timeline. Each step is a
 * connected node with an emoji, a keyword, and a single line of
 * body. Steps animate in sequence on mount with framer-motion
 * stagger.
 *
 * Pure: takes no data, just renders the canonical 4 steps.
 */
const STEPS = [
  { num: "01", emoji: "☕", keyword: "THEME DROPS", body: "Daily place type. Find it anywhere on Earth." },
  { num: "02", emoji: "📸", keyword: "SNAP IT", body: "Photo + optional GPS. Anywhere matching the theme." },
  { num: "03", emoji: "🗳️", keyword: "VOTED IN", body: "Community votes HUMAN or SUS. Top 25 advance." },
  { num: "04", emoji: "🏆", keyword: "LAST ONE", body: "Each day fewer survive. Winner takes the pot." },
];

export default function DayTimeline() {
  return (
    <div className="w-full">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono text-amber text-[10px] tracking-widest uppercase mb-3 text-center"
      >
        A day in the life
      </motion.p>
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.12, type: "spring", damping: 18 }}
            className="relative flex flex-col items-center"
          >
            {/* Connecting line on the right (except the last) */}
            {i < STEPS.length - 1 && (
              <div className="absolute top-5 left-1/2 w-full h-px bg-gradient-to-r from-amber/40 to-ember/20" aria-hidden />
            )}
            <div className="relative z-10 w-10 h-10 rounded-full bg-ash border border-amber/40 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(255,184,0,0.2)]">
              {step.emoji}
            </div>
            <p className="font-mono text-amber text-[9px] tracking-widest mt-2 text-center">
              {step.keyword}
            </p>
            <p className="font-mono text-dim text-[10px] mt-1 text-center leading-tight px-1">
              {step.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
