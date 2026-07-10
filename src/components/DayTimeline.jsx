import { motion } from "framer-motion";
import { DAILY_LOOP } from "../lib/copy.js";

/**
 * DayTimeline — "how it works" as a warm, editorial numbered flow for the
 * landing narrative (docs/ART_DIRECTION.md). Four beats of a single day, big
 * amber numerals down a connecting rail. Replaced the old cold ash-circle +
 * emoji row. Animates in on scroll.
 *
 * Copy lives in lib/copy.js (DAILY_LOOP) — the documented single source of
 * truth for "how to play" — not hardcoded here, so this can't drift from
 * RULES/FAQS again.
 */
const STEPS = DAILY_LOOP;

export default function DayTimeline() {
  return (
    <div className="w-full">
      {STEPS.map((step, i) => (
        <motion.div
          key={step.num}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.08, type: "spring", damping: 20 }}
          className="flex gap-4"
        >
          {/* numeral + connecting rail */}
          <div className="flex flex-col items-center">
            <span className="font-display text-amber leading-none" style={{ fontSize: 34 }}>
              {step.num}
            </span>
            {i < STEPS.length - 1 && <span className="w-px flex-1 my-1 bg-gradient-to-b from-amber/40 to-ember/10" />}
          </div>
          <div className={i < STEPS.length - 1 ? "pb-5" : ""}>
            <p className="font-display text-bone text-xl tracking-wide leading-none">{step.title}</p>
            <p className="font-body text-dim text-sm mt-1.5 leading-snug">{step.body}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
