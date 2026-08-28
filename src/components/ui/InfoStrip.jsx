import { motion } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "../../lib/motion.js";

/**
 * InfoStrip — a tight vertical list of icon + title + body rows with a
 * staggered slide-in. The shared "how it works" pattern used by the
 * prelaunch preview walls (CheckIn / Vote / History / Chat) so the idiom
 * lives in one place instead of four.
 *
 * @param {{ icon: string, title: string, body: string }[]} items
 * @param {number} [stagger] per-row delay in seconds
 * @param {number} [startDelay] delay before the first row
 */
export default function InfoStrip({ items, stagger = 0.06, startDelay = 0 }) {
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: MOTION_DURATION.base,
            ease: MOTION_EASE.smooth,
            delay: startDelay + i * stagger,
          }}
          className="flex gap-3 items-center"
        >
          <span className="text-lg shrink-0" aria-hidden>{item.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="font-display text-sm text-bone">{item.title}</span>
            <span className="text-dim text-xs font-body"> — {item.body}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
