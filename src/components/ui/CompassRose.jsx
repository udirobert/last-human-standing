import { useId } from "react";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as P } from "./gouachePalette.js";

/**
 * CompassRose — a small hand-painted compass for the desktop gutters.
 *
 * The game's premise is proving you're somewhere real. A compass rose
 * is the classic map element that says "this is a map, and you're on
 * it." Painted in the same gouache hand as every other motif, so it
 * belongs to the same family.
 *
 * Small, characterful, placed in a gutter corner. The needle points
 * north with a slow, gentle wobble (not a spin — a compass at rest
 * still moves slightly). Reduced-motion: static.
 */
export default function CompassRose({
  size = 80,
  opacity = 0.25,
  className = "",
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ opacity }}
      role="img"
      aria-label="a painted compass rose"
    >
      <defs>
        <GouacheFilters id={uid} />
      </defs>

      {/* Outer ring */}
      <circle cx="50" cy="50" r="42" fill="none" stroke={P.cream} strokeWidth="1.5" opacity="0.4" filter={`url(#${uid}-brush)`} />
      <circle cx="50" cy="50" r="36" fill="none" stroke={P.cream} strokeWidth="0.8" opacity="0.25" filter={`url(#${uid}-brush)`} />

      {/* Cardinal direction ticks */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 36;
        const y1 = 50 + Math.sin(rad) * 36;
        const x2 = 50 + Math.cos(rad) * 42;
        const y2 = 50 + Math.sin(rad) * 42;
        return (
          <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={P.cream} strokeWidth="1.5" opacity="0.5" filter={`url(#${uid}-brush)`} />
        );
      })}

      {/* Intercardinal ticks (smaller) */}
      {[45, 135, 225, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 38;
        const y1 = 50 + Math.sin(rad) * 38;
        const x2 = 50 + Math.cos(rad) * 42;
        const y2 = 50 + Math.sin(rad) * 42;
        return (
          <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={P.cream} strokeWidth="0.8" opacity="0.3" filter={`url(#${uid}-brush)`} />
        );
      })}

      {/* Compass needle — north pointer in amber, south in cream */}
      <g filter={`url(#${uid}-brush)`} className="compass-needle">
        {/* North half (amber) */}
        <path d="M50,14 L54,50 L50,46 L46,50 Z" fill={P.petal} opacity="0.8" />
        {/* South half (cream) */}
        <path d="M50,86 L46,50 L50,54 L54,50 Z" fill={P.creamShade} opacity="0.5" />
        {/* East-west (thin) */}
        <path d="M86,50 L50,46 L54,50 L50,54 Z" fill={P.cream} opacity="0.3" />
        <path d="M14,50 L50,54 L46,50 L50,46 Z" fill={P.cream} opacity="0.3" />
      </g>

      {/* Center pin */}
      <circle cx="50" cy="50" r="3" fill={P.iron} opacity="0.6" filter={`url(#${uid}-brush)`} />
      <circle cx="50" cy="50" r="1.5" fill={P.cream} opacity="0.4" />

      {/* N label */}
      <text
        x="50"
        y="10"
        textAnchor="middle"
        fontFamily="'Bebas Neue', cursive"
        fontSize="9"
        fill={P.cream}
        opacity="0.5"
        letterSpacing="0.1em"
      >
        N
      </text>
    </svg>
  );
}
