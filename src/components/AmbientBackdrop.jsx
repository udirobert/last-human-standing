import { motion, useReducedMotion } from "framer-motion";
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
 *   1. Warm radial gradient — the "lit room" (phase + day tint)
 *   2. Topographic contour texture — geographic identity
 *   3. Paper grain — tactile surface
 *   4. Color pools — slow-pulsing warm light
 *   5. Population field — warm dots representing the surviving field
 *   6. EmberField — concentric ripple near the bottom
 *   7. AmbientMotifs — soft corner flourishes (day-rotated)
 */

const ROOMS = {
  prelaunch: "radial-gradient(130% 95% at 50% 0%, #4a3221 0%, #2a1c14 42%, #16100c 100%)",
  live: "radial-gradient(130% 95% at 50% 0%, #3a2418 0%, #1e1812 45%, #12100e 100%)",
  ended: "radial-gradient(130% 95% at 50% 0%, #2a2420 0%, #181614 50%, #10100f 100%)",
};

/** Day tints layered over the live room — subtle, not a palette swap. */
const DAY_ROOM_TINTS = {
  1: "radial-gradient(90% 70% at 20% 10%, rgba(212,160,80,0.14) 0%, transparent 55%)",
  2: "radial-gradient(90% 70% at 80% 15%, rgba(80,140,90,0.12) 0%, transparent 55%)",
  3: "radial-gradient(90% 70% at 50% 0%, rgba(200,120,90,0.12) 0%, transparent 55%)",
  4: "radial-gradient(90% 70% at 15% 40%, rgba(90,110,160,0.10) 0%, transparent 55%)",
  5: "radial-gradient(100% 80% at 70% 0%, rgba(220,140,70,0.16) 0%, transparent 60%)",
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

const LIVE_DAY_PALETTES = {
  1: [
    { color: "bg-amber/22", size: "w-[24rem] h-[24rem]", pos: "-top-28 -left-16", scale: [1, 1.1, 1], duration: 7 },
    { color: "bg-blood/18", size: "w-[20rem] h-[20rem]", pos: "-bottom-24 -right-16", scale: [1, 1.14, 1], duration: 9 },
    { color: "bg-amber/12", size: "w-64 h-64", pos: "top-1/2 right-0", scale: [1, 1.06, 1], duration: 11 },
  ],
  2: [
    { color: "bg-neon/18", size: "w-[26rem] h-[26rem]", pos: "-top-32 -right-20", scale: [1, 1.12, 1], duration: 8 },
    { color: "bg-amber/14", size: "w-[22rem] h-[22rem]", pos: "-bottom-28 -left-16", scale: [1, 1.1, 1], duration: 10 },
    { color: "bg-neon/10", size: "w-72 h-72", pos: "top-1/3 left-1/3", scale: [1, 1.08, 1], duration: 12 },
  ],
  3: [
    { color: "bg-blood/22", size: "w-[24rem] h-[24rem]", pos: "-top-24 left-0", scale: [1, 1.14, 1], duration: 6 },
    { color: "bg-amber/20", size: "w-[22rem] h-[22rem]", pos: "-bottom-32 -right-12", scale: [1, 1.12, 1], duration: 8 },
    { color: "bg-neon/12", size: "w-60 h-60", pos: "top-1/2 -left-10", scale: [1, 1.08, 1], duration: 10 },
  ],
  4: [
    { color: "bg-ember/25", size: "w-[24rem] h-[24rem]", pos: "-top-28 -left-24", scale: [1, 1.1, 1], duration: 9 },
    { color: "bg-neon/14", size: "w-[20rem] h-[20rem]", pos: "bottom-0 right-0", scale: [1, 1.12, 1], duration: 11 },
    { color: "bg-amber/12", size: "w-64 h-64", pos: "top-1/3 right-1/4", scale: [1, 1.06, 1], duration: 13 },
  ],
  5: [
    { color: "bg-amber/28", size: "w-[28rem] h-[28rem]", pos: "-top-36 -right-16", scale: [1, 1.16, 1], duration: 7 },
    { color: "bg-blood/20", size: "w-[22rem] h-[22rem]", pos: "-bottom-28 -left-20", scale: [1, 1.1, 1], duration: 9 },
    { color: "bg-amber/16", size: "w-72 h-72", pos: "top-1/2 left-1/2 -translate-x-1/2", scale: [1, 1.08, 1], duration: 11 },
  ],
};

const TOPO_SEEDS = { prelaunch: 17, live: 42, ended: 89 };
const DAY_TOPO_SEEDS = { 1: 42, 2: 51, 3: 63, 4: 74, 5: 88 };

export default function AmbientBackdrop({
  phase = "prelaunch",
  ember = true,
  /** Soft corner artefacts. Default: on for live (day-rotated), off otherwise. */
  flourishes,
  /** Population field: number of alive/reserved players. */
  populationCount,
  /** Population field: total cohort size. */
  populationTotal,
  /** Population field: whether to show a winner glow on the last dot. */
  populationWinner = false,
  /** Current game day (1-5) for topo day markers + room variety. */
  currentDay = null,
}) {
  const reduceMotion = useReducedMotion();
  const day = Number.isFinite(Number(currentDay)) ? Number(currentDay) : null;
  const palette =
    phase === "live" && day && LIVE_DAY_PALETTES[day]
      ? LIVE_DAY_PALETTES[day]
      : PALETTES[phase] ?? PALETTES.prelaunch;
  const room = ROOMS[phase] ?? ROOMS.prelaunch;
  const topoSeed =
    phase === "live" && day && DAY_TOPO_SEEDS[day]
      ? DAY_TOPO_SEEDS[day]
      : TOPO_SEEDS[phase] ?? TOPO_SEEDS.prelaunch;
  const showFlourishes =
    flourishes !== undefined ? flourishes : phase === "live" || phase === "prelaunch";

  const popCount = populationCount ?? (phase === "ended" ? 1 : phase === "prelaunch" ? 0 : 25);
  const popTotal = populationTotal ?? 50;
  const popWinner = populationWinner || phase === "ended";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0" aria-hidden="true">
      {/* 1. Warm radial gradient — the lit room */}
      <div className="absolute inset-0" style={{ background: room }} />
      {phase === "live" && day && DAY_ROOM_TINTS[day] && (
        <div className="absolute inset-0" style={{ background: DAY_ROOM_TINTS[day] }} />
      )}

      {/* 2. Topographic contour texture — geographic identity + day markers */}
      <TopographicTexture
        seed={topoSeed}
        opacity={phase === "ended" ? 0.03 : 0.045}
        currentDay={currentDay}
        phase={phase}
      />

      {/* 3. Paper grain — tactile surface (micro frame-shift when motion ok) */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: 0.055,
          mixBlendMode: "soft-light",
          backgroundImage: PAPER_GRAIN,
          backgroundSize: "300px 300px",
        }}
        animate={
          reduceMotion
            ? { backgroundPosition: "0px 0px" }
            : { backgroundPosition: ["0px 0px", "2px 1px", "0px 0px"] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 18, repeat: Infinity, ease: "linear" }
        }
      />

      {/* 4. Color pools — static when reduced-motion; otherwise slow pulse */}
      {palette.map((p, i) => (
        <motion.div
          key={`${phase}-${day ?? "x"}-${i}`}
          initial={false}
          animate={
            reduceMotion
              ? { opacity: 0.45, scale: 1 }
              : { opacity: [0.35, 0.7, 0.35], scale: p.scale }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.55 }
          }
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
      {ember && !reduceMotion && (
        <div className="absolute inset-0 overflow-hidden">
          <EmberField cy={82} />
        </div>
      )}

      {/* 7. AmbientMotifs — soft corner flourishes (day-rotated when live) */}
      {showFlourishes && (
        <AmbientMotifs density="soft" day={phase === "live" ? day : null} />
      )}
    </div>
  );
}
