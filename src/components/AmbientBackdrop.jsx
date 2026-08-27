import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import EmberField from "./ui/EmberField.jsx";
import AmbientMotifs from "./ui/AmbientMotifs.jsx";
import TopographicTexture from "./ui/TopographicTexture.jsx";
import PopulationField from "./ui/PopulationField.jsx";
import { computeTimeOfDay, daylightTemp, tempToColor } from "../lib/daylight.js";
import {
  deriveLandscapeSeed,
  getLandscapeProfile,
} from "../lib/landscape.js";
import ParallaxLayer from "./ui/ParallaxLayer.jsx";

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
  /** Check-in window open time (ISO, server round.opensAt). When present,
   *  drives a continuous daylight tint instead of the static DAY_ROOM_TINTS. */
  checkinOpensAt = null,
  /** Check-in window close time (ISO, server round.closesAt). */
  checkinClosesAt = null,
  /** Population field render variant: "dot" (default) | "camp". */
  populationVariant = "dot",
  /** Cohort number (state.cohort.cohort). When present with launchAt, drives a
   *  deterministic per-cohort landscape (topo contours, scatter, ember center). */
  cohortNumber = null,
  /** Cohort launch ISO string (state.launchAt). Paired with cohortNumber. */
  cohortLaunchAt = null,
  /** Depth parallax via device orientation / mouse. Opt-in (default off)
   *  so the default DOM is unchanged; layers wrap in ParallaxLayer only when
   *  on. Respects prefers-reduced-motion (no listeners, MotionValues stay 0).
   *  NOTE: the ParallaxProvider lives in AppShell (so its iOS permission
   *  chip can be tappable); ParallaxLayer is a plain passthrough when no
   *  provider is mounted, which is the case for every non-AppShell usage. */
  parallax = false,
}) {
  const reduceMotion = useReducedMotion();
  const day = Number.isFinite(Number(currentDay)) ? Number(currentDay) : null;
  const palette =
    phase === "live" && day && LIVE_DAY_PALETTES[day]
      ? LIVE_DAY_PALETTES[day]
      : PALETTES[phase] ?? PALETTES.prelaunch;
  const room = ROOMS[phase] ?? ROOMS.prelaunch;
  const baseTopoSeed =
    phase === "live" && day && DAY_TOPO_SEEDS[day]
      ? DAY_TOPO_SEEDS[day]
      : TOPO_SEEDS[phase] ?? TOPO_SEEDS.prelaunch;
  const showFlourishes =
    flourishes !== undefined ? flourishes : phase === "live" || phase === "prelaunch";

  // Deterministic per-cohort landscape. When cohort identity is available,
  // override the generic topo seed / pop seed / ember center with cohort-
  // specific values so each cohort inhabits its own world. Additive: absent
  // cohort info leaves every default untouched.
  const landscape = useMemo(() => {
    if (cohortNumber == null || !cohortLaunchAt) return null;
    const ms = Date.parse(cohortLaunchAt);
    if (!Number.isFinite(ms)) return null;
    return getLandscapeProfile(deriveLandscapeSeed(cohortNumber, ms));
  }, [cohortNumber, cohortLaunchAt]);
  // Per-day contour variation survives the cohort landscape: the cohort keeps
  // its identity (seed) while the terrain still shifts day to day.
  const topoSeed = landscape
    ? landscape.topoSeedForDay(phase === "live" ? day : null)
    : baseTopoSeed;
  const popSeed = landscape ? landscape.popSeed : 7;
  const emberCx = landscape ? landscape.emberCx : 50;
  const emberCy = landscape ? landscape.emberCy : 82;

  const popCount = populationCount ?? (phase === "ended" ? 1 : phase === "prelaunch" ? 0 : 25);
  const popTotal = populationTotal ?? 50;
  const popWinner = populationWinner || phase === "ended";

  // Continuous daylight: when the server provides the check-in window, derive
  // a temperature from (day, time-of-day) and tint the room continuously.
  // Falls back to the static per-day DAY_ROOM_TINTS when timing is unavailable
  // (prelaunch, ended, or live without a round). One number drives one tint —
  // the Lattice night-system principle. Pure function of inputs, no state.
  const timeOfDay = computeTimeOfDay(checkinOpensAt, checkinClosesAt);
  const useDynamicTint = phase === "live" && day != null && timeOfDay != null;
  const temp = useDynamicTint ? daylightTemp(day - 1, timeOfDay) : null;
  const ambientTint = useDynamicTint ? tempToColor(temp) : null;
  // Gradient origin shifts with temperature: cool mornings anchor upper-left,
  // warm evenings drift toward center-right. Mirrors DAY_ROOM_TINTS' positions.
  const tintOriginX = useDynamicTint ? 50 - temp * 20 : 50;

  // Depth parallax: only wrap layers when enabled, so the default (off) DOM
  // is byte-for-byte unchanged. When on, each layer sits in a ParallaxLayer
  // scaled by depth (0=far/least move → 1=near/most move); the
  // ParallaxProvider (mounted by AppShell) runs useParallaxDepth once and
  // feeds the MotionValues via context.
  const wrap = (depth, node) => (parallax ? <ParallaxLayer depth={depth}>{node}</ParallaxLayer> : node);

  const layers = (
    <>
      {/* 1. Warm radial gradient — the lit room (depth 0: never shifts, so
          the full-bleed gradient exposes no edge gap) */}
      {wrap(0, <div className="absolute inset-0" style={{ background: room }} />)}
      {wrap(
        0.05,
        useDynamicTint ? (
          /* Dynamic day tint — continuous daylight from the check-in window.
           * A 60s CSS transition smooths sub-second recomputes (the value only
           * moves as real time passes, so the transition is effectively a soft
           * low-pass, not a repaint storm). */
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(90% 70% at ${tintOriginX}% 0%, ${ambientTint} 0%, transparent 60%)`,
              transition: "background 60s linear",
            }}
          />
        ) : (
          phase === "live" && day && DAY_ROOM_TINTS[day] && (
            <div className="absolute inset-0" style={{ background: DAY_ROOM_TINTS[day] }} />
          )
        ),
      )}

      {/* 2. Topographic contour texture — geographic identity + day markers */}
      {wrap(
        0.1,
        <TopographicTexture
          seed={topoSeed}
          opacity={phase === "ended" ? 0.03 : 0.045}
          currentDay={currentDay}
          phase={phase}
        />,
      )}

      {/* 3. Paper grain — tactile surface (micro frame-shift when motion ok) */}
      {wrap(
        0.15,
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
        />,
      )}

      {/* 4. Color pools — static when reduced-motion; otherwise slow pulse */}
      {wrap(
        0.25,
        palette.map((p, i) => (
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
        )),
      )}

      {/* 5. Population field — the living crowd, the brand essence */}
      {wrap(
        0.45,
        <PopulationField
          count={popCount}
          total={popTotal}
          phase={phase}
          winner={popWinner}
          variant={populationVariant}
          seed={popSeed}
        />,
      )}

      {/* 6. EmberField — concentric ripple near the bottom */}
      {wrap(
        0.55,
        ember && !reduceMotion && (
          <div className="absolute inset-0 overflow-hidden">
            <EmberField cx={emberCx} cy={emberCy} />
          </div>
        ),
      )}

      {/* 7. AmbientMotifs — soft corner flourishes (day-rotated when live) */}
      {wrap(
        0.7,
        showFlourishes && (
          <AmbientMotifs
            density="soft"
            day={phase === "live" ? day : null}
            seed={landscape ? landscape.motifSeed : null}
          />
        ),
      )}
    </>
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0" aria-hidden="true">
      {layers}
    </div>
  );
}
