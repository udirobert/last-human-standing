import { motion } from "framer-motion";

/**
 * Ambient background for the welcome screen. Slow-pulsing radial
 * gradient + a few floating particles. Sits behind the content
 * at z-0; pointer-events-none so it never blocks taps.
 */
export default function AmbientBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0">
      {/* Pulsing radial gradient */}
      <motion.div
        initial={{ opacity: 0.5, scale: 1 }}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blood/20 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0.4, scale: 1 }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.12, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-amber/10 blur-3xl"
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
          className="absolute w-1 h-1 rounded-full bg-amber/40"
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
