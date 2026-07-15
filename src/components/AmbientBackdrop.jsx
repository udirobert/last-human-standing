import { motion } from "framer-motion";
import EmberField from "./ui/EmberField.jsx";
import AmbientMotifs from "./ui/AmbientMotifs.jsx";
import TopographicTexture from "./ui/TopographicTexture.jsx";
import PopulationField from "./ui/PopulationField.jsx";

const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Shared atmospheric room (docs/ART_DIRECTION.md).
 *
 * Layer stack (bottom to top):
 *   1. Warm radial gradient — the "lit room"
 *   2. Topographic contour texture — the game's geographic identity
 *   3. Paper grain — tactile surface
 *   4. Color pools — slow-pulsing warm light
 *   5. Population field — warm dots representing the surviving field.
 *      This is the brand essence: you see the crowd, you feel them thin.
 *   6. EmberField — concentric ripple near the bottom
 *   7. AmbientMotifs — soft corner flourishes (off by default now; the
 *      population dots and topo texture carry the character)
 *
 * Population data is optional. When provided, the backdrop becomes a
 * living representation of game state. When absent (e.g. SpeedRun), it
 * falls back to a static ambient field.
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

// Topo seeds per phase — the "map" shifts as the game progresses
const TOPO_SEEDS = { prelaunch: 17, live: 42, ended: 89 };

export default function AmbientBackdrop({
  phase = "prelaunch",
  ember = true,
  /** Soft corner artefacts. Off by default — population dots + topo carry
   *  the character now. Enable on ceremony screens that want extra warmth. */
  flourishes = false,
  /** Population field: number of alive/reserved players. */
  populationCount,
  /** Population field: total cohort size. */
  populationTotal,
  /** Population field: whether to show a winner glow on the last dot. */
  populationWinner = false,
}) {
  const palette = PALETTES[phase] ?? PALETTES.prelaunch;
  const room = ROOMS[phase] ?? ROOMS.prelaunch;
  const topoSeed = TOPO_SEEDS[phase] ?? TOPO_SEEDS.prelaunch;

  // Resolve population data — fall back to sensible defaults per phase
  const popCount = populationCount ?? (phase === "ended" ? 1 : phase === "prelaunch" ? 0 : 25);
  const popTotal = populationTotal ?? 50;
  const popWinner = populationWinner || phase === "ended";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0" aria-hidden="true">
      {/* 1. Warm radial gradient — the lit room */}
      <div className="absolute inset-0" style={{ background: room }} />

      {/* 2. Topographic contour texture — geographic identity */}
      <TopographicTexture seed={topoSeed} opacity={phase === "ended" ? 0.03 : 0.045} />

      {/* 3. Paper grain — tactile surface */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.055,
          mixBlendMode: "soft-light",
          backgroundImage: PAPER_GRAIN,
          backgroundSize: "300px 300px",
        }}
      />

      {/* 4. Color pools — slow-pulsing warm light */}
      {palette.map((p, i) => (
        <motion.div
          key={`${phase}-${i}`}
          initial={{ opacity: 0.35, scale: 1 }}
          animate={{ opacity: [0.35, 0.7, 0.35], scale: p.scale }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.55 }}
          className={`absolute ${p.pos} ${p.size} rounded-full ${p.color} blur-3xl`}
        />
      ))}

      {/* 5. Population field — the living crowd, the brand essence */}
      <PopulationField
        count={popCount}
        total={popTotal}
        phase={phase}
        winner={popWinner}
      />

      {/* 6. EmberField — concentric ripple near the bottom */}
      {ember && (
        <div className="absolute inset-0 overflow-hidden">
          <EmberField cy={82} />
        </div>
      )}

      {/* 7. AmbientMotifs — soft corner flourishes (optional) */}
      {flourishes && <AmbientMotifs />}
    </div>
  );
}
