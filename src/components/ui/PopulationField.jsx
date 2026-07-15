import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

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
 *
 * The dots are deterministic per-index (seeded positions) so they don't
 * jump around when the count changes — eliminated dots fade in place.
 */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// Deterministic pseudo-random for stable dot positions
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_DOTS = 50;

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
        const x = p.x + p.driftX * wave;
        const y = p.y + p.driftY * Math.cos(t * p.speed + p.phase);
        el.style.transform = `translate(${x}%, ${y}%)`;
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
    >
      {positions.slice(0, totalCount).map((p, i) => {
        const isAlive = i < aliveCount;
        const isWinner = winner && aliveCount === 1 && i === 0;
        const color = isWinner ? winnerColor : isAlive ? aliveColor : eliminatedColor;
        const baseOpacity = isWinner ? 0.9 : isAlive ? 0.55 : 0.08;
        const size = isWinner ? 8 : p.size;

        return (
          <motion.span
            key={i}
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
        );
      })}
    </div>
  );
}
