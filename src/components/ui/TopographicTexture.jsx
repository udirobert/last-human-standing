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

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { mulberry32 } from "../../lib/rng.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

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
  /** Current game day (1-5). When set, day markers are rendered at
   *  different contour elevations, with the current day brightened. */
  currentDay = null,
  /** Phase — controls day marker styling. */
  phase = "prelaunch",
}) {
  const reduce = usePrefersReducedMotion();
  const contours = generateContours(seed, rings, cx, cy, baseRadius, spacing, wobble);

  // Day markers: D1-D5 placed at ascending elevations on the topo map,
  // like checkpoints on a hiking trail. Each sits on a different contour
  // ring, spread around the map at different angles.
  const DAY_MARKERS = [
    { day: 1, ring: 0, angle: -0.6 },
    { day: 2, ring: 1, angle: 1.2 },
    { day: 3, ring: 2, angle: 2.4 },
    { day: 4, ring: 3, angle: 3.6 },
    { day: 5, ring: 4, angle: 4.8 },
  ];

  function dayMarkerPos(marker) {
    const radius = baseRadius + marker.ring * spacing;
    const x = cx + Math.cos(marker.angle) * radius;
    const y = cy + Math.sin(marker.angle) * radius * 0.7;
    return { x, y };
  }

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

      {/* Day markers — D1 through D5, placed at different contour
          elevations like waypoints on a trail. The current day
          brightens; past days dim to ghosts; future days are faint. */}
      {currentDay && DAY_MARKERS.map((marker) => {
        const { x, y } = dayMarkerPos(marker);
        const isPast = phase === "live" && marker.day < currentDay;
        const isCurrent = phase === "live" && marker.day === currentDay;
        const isFuture = phase === "live" && marker.day > currentDay;
        const isEnded = phase === "ended";
        const markerOpacity = isCurrent ? 0.7 : isPast ? 0.15 : isEnded && marker.day === 5 ? 0.6 : isEnded ? 0.1 : 0.2;
        const markerColor = isCurrent ? "#F4B84A" : isEnded && marker.day === 5 ? "#FFB800" : stroke;
        const markerSize = isCurrent ? 5 : 3;

        return (
          <g key={`day-${marker.day}`} opacity={markerOpacity}>
            {/* Waypoint dot */}
            <circle cx={x} cy={y} r={markerSize} fill={markerColor} />
            {isCurrent && (
              <circle cx={x} cy={y} r={markerSize * 2} fill="none" stroke={markerColor} strokeWidth="0.5" opacity="0.5" />
            )}
            {/* Day label */}
            <text
              x={x}
              y={y - markerSize - 3}
              textAnchor="middle"
              fontFamily="'DM Mono', monospace"
              fontSize="6"
              fill={markerColor}
              letterSpacing="0.05em"
            >
              D{marker.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
