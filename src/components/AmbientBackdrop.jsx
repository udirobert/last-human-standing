import { motion } from "framer-motion";

const PALETTES = {
  // Ambient gradient hues per phase. prelaunch=amber+red,
  // live=neon+amber (high energy), ended=cool dim.
  prelaunch: [
    { color: "bg-blood/20", size: "w-80 h-80", pos: "-top-20 -left-20", scale: [1, 1.08, 1], duration: 6 },
    { color: "bg-amber/10", size: "w-96 h-96", pos: "-bottom-32 -right-20", scale: [1, 1.12, 1], duration: 8 },
  ],
  live: [
    { color: "bg-neon/25", size: "w-96 h-96", pos: "-top-24 -left-16", scale: [1, 1.1, 1], duration: 5 },
    { color: "bg-blood/15", size: "w-80 h-80", pos: "-bottom-24 -right-16", scale: [1, 1.15, 1], duration: 7 },
  ],
  ended: [
    { color: "bg-dim/15", size: "w-80 h-80", pos: "-top-20 -left-20", scale: [1, 1.04, 1], duration: 10 },
    { color: "bg-ember/10", size: "w-96 h-96", pos: "-bottom-24 -right-20", scale: [1, 1.06, 1], duration: 12 },
  ],
};

/**
 * Ambient background. Slow-pulsing radial gradients + a few
 * floating particles. Phase-aware — colors shift between
 * prelaunch (amber/red), live (neon/red), and ended (dim).
 * Sits behind the content at z-0; pointer-events-none so it
 * never blocks taps.
 */
export default function AmbientBackdrop({ phase = "prelaunch" }) {
  const palette = PALETTES[phase] ?? PALETTES.prelaunch;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0">
      {palette.map((p, i) => (
        <motion.div
          key={`${phase}-${i}`}
          initial={{ opacity: 0.4, scale: 1 }}
          animate={{ opacity: [0.3, 0.65, 0.3], scale: p.scale }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          className={`absolute ${p.pos} ${p.size} rounded-full ${p.color} blur-3xl`}
        />
      ))}

      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.5, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          className={`absolute w-1 h-1 rounded-full ${phase === "live" ? "bg-neon/40" : "bg-amber/40"}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        />
      ))}
    </div>
  );
}

const PARTICLES = [
  { x: 12, y: 18, duration: 7, delay: 0 },
  { x: 78, y: 22, duration: 9, delay: 1.5 },
  { x: 25, y: 65, duration: 8, delay: 0.8 },
  { x: 88, y: 70, duration: 10, delay: 2.2 },
  { x: 50, y: 40, duration: 11, delay: 0.4 },
  { x: 15, y: 80, duration: 9, delay: 1.2 },
  { x: 65, y: 12, duration: 8, delay: 0.6 },
  { x: 40, y: 88, duration: 10, delay: 1.8 },
];
