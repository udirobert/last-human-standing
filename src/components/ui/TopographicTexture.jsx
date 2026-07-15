/**
 * TopographicTexture — faint contour lines layered under the warm gradient.
 *
 * The game's premise is proving you're somewhere real. A topographic
 * contour-line pattern grounds the backdrop in physical geography without
 * being literal. Maps = presence = proof. This is unique to this game —
 * no other app has this texture.
 *
 * Renders as an inline SVG with organic, slightly irregular closed curves
 * at very low opacity (3-5%). The curves are deterministic (seeded) so
 * they don't shift between renders — they're the bedrock, not animation.
 *
 * Reduced-motion: static, no breathing animation.
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

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Deterministic pseudo-random for stable contour shapes
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a set of contour rings. Each ring is a closed bezier path
 * that's slightly irregular — like elevation lines on a topo map.
 */
function generateContours(seed, rings, cx, cy, baseRadius, spacing, wobble) {
  const rng = mulberry32(seed);
  const paths = [];
  for (let r = 0; r < rings; r++) {
    const radius = baseRadius + r * spacing;
    const points = 16; // resolution of each ring
    const segments = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      // Irregular radius — elevation lines aren't perfect circles
      const wobbleAmp = wobble * (0.6 + rng() * 0.4);
      const rr = radius + Math.sin(angle * 2 + rng() * 3) * wobbleAmp + (rng() - 0.5) * wobbleAmp;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr * 0.7; // slightly flattened, like a map projection
      segments.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    segments.push("Z");
    paths.push(segments.join(" "));
  }
  return paths;
}

export default function TopographicTexture({
  /** Seed for deterministic shapes. Changes per phase so the "map" shifts. */
  seed = 42,
  /** Base opacity of the contour lines (0-1). */
  opacity = 0.04,
  /** Stroke color — warm tone to sit under the gradient. */
  stroke = "#E7DDC6",
  /** Number of contour rings. */
  rings = 7,
  /** Center of the topo pattern in viewBox coordinates. */
  cx = 200,
  cy = 180,
  /** Starting radius for the innermost ring. */
  baseRadius = 30,
  /** Spacing between rings. */
  spacing = 38,
  /** How irregular the lines are (higher = more wobble). */
  wobble = 14,
  /** Gentle breathing animation for the whole field. */
  breathe = true,
}) {
  const reduce = usePrefersReducedMotion();
  const contours = generateContours(seed, rings, cx, cy, baseRadius, spacing, wobble);

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 360"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g
        fill="none"
        stroke={stroke}
        strokeWidth={0.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {contours.map((d, i) => (
          <path key={i} d={d} opacity={1 - i * 0.06} />
        ))}
      </g>
      {breathe && !reduce && (
        <motion.g
          fill="none"
          stroke={stroke}
          strokeWidth={0.4}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.02, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          {contours.slice(0, 3).map((d, i) => (
            <path key={`b-${i}`} d={d} />
          ))}
        </motion.g>
      )}
    </svg>
  );
}
