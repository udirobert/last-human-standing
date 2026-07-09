import { motion } from "framer-motion";

/**
 * DayTimeline — "how it works" as a warm, editorial numbered flow for the
 * landing narrative (docs/ART_DIRECTION.md). Four beats of a single day, big
 * amber numerals down a connecting rail. Replaced the old cold ash-circle +
 * emoji row. Animates in on scroll.
 */
const STEPS = [
  {
    num: "01",
    title: "A theme drops",
    body: "Every morning a real-world place lands — a café, a park, a sunrise. Find it anywhere on Earth.",
  },
  {
    num: "02",
    title: "Snap your proof",
    body: "A photo, optionally GPS-stamped, inside the check-in window. That's your proof you're still here.",
  },
  {
    num: "03",
    title: "The crowd votes",
    body: "Everyone judges each proof — human or sus. The survival cap shrinks a little more every day.",
  },
  {
    num: "04",
    title: "Last human standing",
    body: "50 → 25 → 12 → 6 → 3 → 1. Outlast the crowd for five days and the whole pot is yours.",
  },
];

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
