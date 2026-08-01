import { motion, useReducedMotion } from "framer-motion";

/** Low ember-seed cluster — Manus backdrop pass motif (day 5). */
export default function EmberSeeds({ size = 36, className = "" }) {
  const reduceMotion = useReducedMotion();
  const seeds = [
    { cx: 10, cy: 22, r: 4.2, fill: "#c45a2a", o: 0.35 },
    { cx: 20, cy: 18, r: 3.4, fill: "#d4a050", o: 0.28 },
    { cx: 28, cy: 24, r: 3.8, fill: "#a03828", o: 0.32 },
    { cx: 16, cy: 28, r: 2.6, fill: "#e8b060", o: 0.22 },
    { cx: 24, cy: 30, r: 2.2, fill: "#b84828", o: 0.2 },
  ];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      className={className}
      aria-hidden="true"
      animate={reduceMotion ? { opacity: 1 } : { opacity: [0.85, 1, 0.85] }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 12, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {seeds.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.o} />
      ))}
    </motion.svg>
  );
}
