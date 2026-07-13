import { motion } from "framer-motion";
import EmberField from "./ui/EmberField.jsx";
import AmbientMotifs from "./ui/AmbientMotifs.jsx";

const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Shared atmospheric room (docs/ART_DIRECTION.md): warm radial + grain +
 * EmberField + optional soft painted motifs. LandingHero keeps its denser
 * motif layout; elsewhere this stops the human language from falling off a cliff.
 */
const ROOMS = {
  prelaunch: "radial-gradient(130% 95% at 50% 0%, #4a3221 0%, #2a1c14 42%, #16100c 100%)",
  live: "radial-gradient(130% 95% at 50% 0%, #3a2418 0%, #1e1812 45%, #12100e 100%)",
  ended: "radial-gradient(130% 95% at 50% 0%, #2a2420 0%, #181614 50%, #10100f 100%)",
};

const PALETTES = {
  prelaunch: [
    { color: "bg-blood/30", size: "w-[22rem] h-[22rem]", pos: "-top-24 -left-24", scale: [1, 1.1, 1], duration: 7 },
    { color: "bg-amber/25", size: "w-[26rem] h-[26rem]", pos: "-bottom-36 -right-24", scale: [1, 1.14, 1], duration: 9 },
    { color: "bg-amber/10", size: "w-64 h-64", pos: "top-1/3 left-1/2 -translate-x-1/2", scale: [1, 1.06, 1], duration: 11 },
  ],
  live: [
    { color: "bg-neon/20", size: "w-[24rem] h-[24rem]", pos: "-top-28 -left-20", scale: [1, 1.12, 1], duration: 6 },
    { color: "bg-blood/25", size: "w-[22rem] h-[22rem]", pos: "-bottom-28 -right-20", scale: [1, 1.16, 1], duration: 8 },
    { color: "bg-amber/15", size: "w-72 h-72", pos: "top-1/2 right-0", scale: [1, 1.08, 1], duration: 10 },
  ],
  ended: [
    { color: "bg-dim/20", size: "w-80 h-80", pos: "-top-20 -left-20", scale: [1, 1.05, 1], duration: 12 },
    { color: "bg-ember/20", size: "w-96 h-96", pos: "-bottom-24 -right-20", scale: [1, 1.08, 1], duration: 14 },
  ],
};

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

export default function AmbientBackdrop({
  phase = "prelaunch",
  ember = true,
  /** Soft corner artefacts. Off on ceremony screens that already own a large ThemeMotif. */
  flourishes = true,
}) {
  const palette = PALETTES[phase] ?? PALETTES.prelaunch;
  const room = ROOMS[phase] ?? ROOMS.prelaunch;
  const particleTone = phase === "live" ? "bg-neon/50" : "bg-amber/50";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: room }} />

      <div
        className="absolute inset-0"
        style={{
          opacity: 0.055,
          mixBlendMode: "soft-light",
          backgroundImage: PAPER_GRAIN,
          backgroundSize: "300px 300px",
        }}
      />

      {palette.map((p, i) => (
        <motion.div
          key={`${phase}-${i}`}
          initial={{ opacity: 0.35, scale: 1 }}
          animate={{ opacity: [0.35, 0.7, 0.35], scale: p.scale }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.55 }}
          className={`absolute ${p.pos} ${p.size} rounded-full ${p.color} blur-3xl`}
        />
      ))}

      {ember && (
        <div className="absolute inset-0 overflow-hidden">
          <EmberField cy={82} />
        </div>
      )}

      {flourishes && <AmbientMotifs />}

      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, -28, 0], opacity: [0, 0.55, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          className={`absolute w-1 h-1 rounded-full ${particleTone}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        />
      ))}
    </div>
  );
}
