import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { mulberry32 } from "../../lib/rng.js";
import IsometricCamp from "./IsometricCamp.jsx";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

/**
 * PopulationField — the living backdrop of Last Human Standing.
 *
 * Warm dots scattered across the backdrop, each representing a player in
 * the surviving field. In prelaunch: dots appear as players reserve. In
 * live: dots drift and breathe, and eliminated ones fade out. By game
 * end: one bright dot remains — the last human standing.
 *
 * This is the backdrop's brand essence. It's not a chart or a widget —
 * it's ambient atmosphere that happens to be real game state. You feel
 * the crowd around you. You feel them disappearing.
 *
 * Props:
 *   count     — number of active/alive players (or reserved in prelaunch)
 *   total     — cohort size (for calculating eliminated dots)
 *   phase     — "prelaunch" | "live" | "ended"
 *   winner    — boolean, when true the last dot gets a crown glow
 *   variant   — "dot" (default) | "camp". "camp" replaces dots with
 *               isometric campfire tiles (IsometricCamp) that slot into the
 *               same rAF via data-dot. Opt-in so the default visual is
 *               unchanged; revert by omitting the prop.
 *
 * The dots are deterministic per-index (seeded positions) so they don't
 * jump around when the count changes — eliminated dots fade in place.
 */

// Cap painted dots for paint cost — 50 rAF-driven nodes janks mid-tier phones.
const MAX_DOTS = 28;

/**
 * Generate stable positions for up to MAX_DOTS dots.
 * Dots are scattered with a min-distance constraint so they don't clump.
 * Positions are in percentage coordinates (0-100) for responsive layout.
 */
function generatePositions(seed, count) {
  const rng = mulberry32(seed);
  const positions = [];
  const minDist = 8; // minimum distance between dot centers (in %)
  let attempts = 0;
  while (positions.length < Math.min(count, MAX_DOTS) && attempts < count * 20) {
    attempts++;
    const x = 6 + rng() * 88; // keep away from edges
    const y = 8 + rng() * 84;
    const tooClose = positions.some((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < minDist;
    });
    if (!tooClose) {
      positions.push({
        x,
        y,
        // Per-dot drift parameters for organic motion
        driftX: (rng() - 0.5) * 6,
        driftY: (rng() - 0.5) * 4,
        phase: rng() * Math.PI * 2,
        speed: 0.3 + rng() * 0.4,
        size: 3 + rng() * 2, // 3-5px base size
      });
    }
  }
  return positions;
}

export default function PopulationField({
  count = 0,
  total = 50,
  phase = "prelaunch",
  winner = false,
  seed = 7,
  /** "dot" (default) renders the original warm dots. "camp" renders
   *  isometric campfire tiles (IsometricCamp) that slot into the same rAF.
   *  Opt-in so the default visual is unchanged. */
  variant = "dot",
}) {
  const reduce = usePrefersReducedMotion();
  const dotsRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate positions for the full cohort once — dots don't move position,
  // they just fade in/out as the count changes.
  const positions = useMemo(() => generatePositions(seed, total), [seed, total]);

  // Determine which dots are "alive" vs "eliminated"
  const aliveCount = Math.min(count, MAX_DOTS);
  const totalCount = Math.min(total, MAX_DOTS);

  // Color tone by phase
  const aliveColor = phase === "live" ? "#F4B84A" : phase === "ended" ? "#FFB800" : "#E7DDC6";
  const eliminatedColor = "#3a2a1e";
  const winnerColor = "#FFB800";
  const ghostColor = phase === "live" ? "#F4B84A" : "#E7DDC6";
  const useCamp = variant === "camp";

  // Animation: use rAF for smooth drift, like EmberField
  useEffect(() => {
    if (reduce || !mounted) return undefined;
    const container = dotsRef.current;
    if (!container) return undefined;
    const els = container.querySelectorAll("[data-dot]");
    let raf = 0;

    const tick = (tMs) => {
      const t = tMs / 1000;
      els.forEach((el, i) => {
        const p = positions[i];
        if (!p) return;
        const wave = Math.sin(t * p.speed + p.phase);
        // Base position is set container-relative on each item's wrapper via
        // left/top (see below), so the rAF only needs to apply the small
        // drift as a px translate. Previously this wrote
        // `translate(${baseX + drift}%, ...)` — but CSS translate() % is
        // relative to the element's OWN border box (~4px), not the
        // container, so every dot collapsed to within ~2px of the origin.
        // Drift values (driftX ±3, driftY ±2) read directly as px here — a
        // gentle ±3px wobble around the base position.
        const dx = p.driftX * wave;
        const dy = p.driftY * Math.cos(t * p.speed + p.phase);
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, mounted, positions]);

  if (totalCount === 0) return null;

  return (
    <div
      ref={dotsRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        // Fade ambient dots out of the lower thumb/CTA band so primary
        // actions and tally labels stay legible.
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 58%, rgba(0,0,0,0.45) 75%, transparent 94%)",
        maskImage:
          "linear-gradient(to bottom, black 0%, black 58%, rgba(0,0,0,0.45) 75%, transparent 94%)",
      }}
    >
      {positions.slice(0, totalCount).map((p, i) => {
        const isAlive = i < aliveCount;
        const isEliminated = !isAlive && phase !== "prelaunch";
        const isWinner = winner && aliveCount === 1 && i === 0;
        const color = isWinner ? winnerColor : isAlive ? aliveColor : eliminatedColor;
        const baseOpacity = isWinner ? 0.9 : isAlive ? 0.55 : 0.08;
        const size = isWinner ? 8 : p.size;

        return (
          /* Base position is container-relative (left/top in %), set once and
           * static — the rAF only adds a small px drift transform to the
           * data-dot child. This fixes the prior scatter bug where
           * translate(%, %) was relative to the ~4px element box, not the
           * container, collapsing all dots to the origin. */
          <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            {useCamp ? (
              /* Isometric camp path — slots into the same rAF via data-dot.
               * The camp's data-dot root sits at left:0/top:0 (i.e. at the
               * wrapper's base position); the rAF adds the px drift; the
               * camp SVG centers itself on that anchor. */
              <IsometricCamp
                alive={isAlive}
                isWinner={isWinner}
                isEliminated={isEliminated}
                anchorSize={size}
                visualSize={isWinner ? 12 : isAlive ? 9 : 8}
                baseOpacity={baseOpacity}
                ghostColor={ghostColor}
                reduce={reduce}
                delay={isAlive ? i * 0.02 : 0}
              />
            ) : (
              <>
                {/* Eliminated ghost ring — a faint persistent echo where a
                    player used to be. By game end, 49 ghost rings scatter
                    the backdrop with one bright dot remaining. */}
                {isEliminated && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 0.12, scale: 1 }}
                    transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
                    className="absolute rounded-full"
                    style={{
                      width: size * 2.5,
                      height: size * 2.5,
                      border: `1px solid ${ghostColor}30`,
                      left: 0,
                      top: 0,
                      marginLeft: -size * 0.75,
                      marginTop: -size * 0.75,
                    }}
                  />
                )}

                <motion.span
                  data-dot
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: baseOpacity,
                    scale: isAlive ? 1 : 0.3,
                  }}
                  transition={{
                    duration: isAlive ? 0.8 : 1.5,
                    ease: "easeOut",
                    delay: isAlive ? i * 0.02 : 0,
                  }}
                  className="absolute rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: color,
                    left: 0,
                    top: 0,
                    willChange: reduce ? undefined : "transform",
                    boxShadow: isWinner
                      ? "0 0 12px rgba(255,184,0,0.8), 0 0 24px rgba(255,184,0,0.4)"
                      : isAlive
                        ? `0 0 ${size * 1.5}px ${color}40`
                        : "none",
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
