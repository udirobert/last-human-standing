import { useId } from "react";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as P } from "./gouachePalette.js";

/**
 * StreakBloom — the second "proof of presence" motif (docs/ART_DIRECTION.md).
 *
 * A potted plant that GROWS with the check-in streak: growth = time = the daily
 * ritual loop, made visible. The ceramic pot deliberately echoes CoffeeBrew's
 * ceramic mug — same material family, same hand (shared GouacheFilters).
 *
 *   streak 0      → dormant sprout (just tended soil)
 *   streak 1–2    → sprout with first leaves
 *   streak 3–6    → stem, leaves, a closed bud
 *   streak 7–29   → open bloom
 *   streak 30+    → full bloom, fuller foliage
 *
 * A whisper-slow sway keeps it alive; frozen under prefers-reduced-motion.
 */
export default function StreakBloom({ streak = 0, size = 64, className = "", title }) {
  const uid = useId().replace(/:/g, "");
  const stage = streak >= 30 ? 4 : streak >= 7 ? 3 : streak >= 3 ? 2 : streak >= 1 ? 1 : 0;
  const topY = [92, 74, 52, 44, 36][stage];
  const label = title || `streak plant, ${streak} day${streak === 1 ? "" : "s"}`;

  // Bloom petals, arranged around the stem tip.
  const petalRing = (n, rx, ry, dist) =>
    Array.from({ length: n }, (_, i) => (
      <g key={i} transform={`rotate(${(360 / n) * i} 60 ${topY})`}>
        <ellipse cx="60" cy={topY - dist} rx={rx} ry={ry} fill={P.petal} />
        <ellipse cx="60" cy={topY - dist - ry * 0.4} rx={rx * 0.6} ry={ry * 0.5} fill={P.petalShade} opacity="0.4" />
      </g>
    ));

  return (
    <svg
      width={size}
      height={size * (140 / 120)}
      viewBox="0 0 120 140"
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <GouacheFilters id={uid} />
        <clipPath id={`${uid}-pot`}>
          <path d="M32,106 L88,106 L80,133 C80,137 40,137 40,133 Z" />
        </clipPath>
      </defs>

      {/* grounding shadow */}
      <ellipse cx="60" cy="135" rx="30" ry="6" fill="#000" opacity="0.4" filter={`url(#${uid}-shadow)`} />

      {/* the growing plant — sways as one unit from the soil */}
      <g className="bloom-sway" style={{ transformOrigin: "60px 101px" }} filter={`url(#${uid}-brush)`}>
        {/* stem */}
        <path d={`M60,101 C57,92 63,82 60,${topY}`} fill="none" stroke={P.stem} strokeWidth="4" strokeLinecap="round" />

        {/* leaves, added as the plant matures */}
        {stage >= 1 && <Leaf x={59} y={86} rot={-52} p={P} />}
        {stage >= 2 && <Leaf x={61} y={74} rot={54} p={P} />}
        {stage >= 4 && <Leaf x={59} y={60} rot={-48} p={P} />}

        {/* stage 0: two tiny cotyledons */}
        {stage === 0 && (
          <>
            <ellipse cx="54" cy="90" rx="6" ry="3.4" fill={P.leaf} transform="rotate(-24 54 90)" />
            <ellipse cx="66" cy="90" rx="6" ry="3.4" fill={P.leaf} transform="rotate(24 66 90)" />
          </>
        )}

        {/* stage 2: a closed bud */}
        {stage === 2 && (
          <>
            <ellipse cx="60" cy={topY} rx="6.5" ry="10" fill={P.bud} />
            <ellipse cx="60" cy={topY + 2} rx="4" ry="7" fill={P.leafShade} opacity="0.5" />
          </>
        )}

        {/* stage 3–4: an open bloom */}
        {stage >= 3 && (
          <>
            {petalRing(stage === 4 ? 7 : 5, stage === 4 ? 8 : 7, stage === 4 ? 14 : 12, stage === 4 ? 13 : 11)}
            <circle cx="60" cy={topY} r={stage === 4 ? 7 : 6} fill={P.petalCore} />
            <circle cx="58" cy={topY - 1.5} r={stage === 4 ? 3 : 2.4} fill={P.bud} opacity="0.7" />
          </>
        )}
      </g>

      {/* the ceramic pot — same hand as the coffee mug */}
      <g filter={`url(#${uid}-brush)`}>
        <path d="M28,98 L92,98 L88,108 L32,108 Z" fill={P.potRim} />
        <path d="M32,106 L88,106 L80,133 C80,137 40,137 40,133 Z" fill={P.terracotta} />
        <path d="M60,106 L88,106 L80,133 C80,136 68,137 60,137 Z" fill={P.terracottaShade} opacity="0.5" />
        <ellipse cx="60" cy="101" rx="26" ry="5" fill={P.soil} />
        <g clipPath={`url(#${uid}-pot)`}>
          <rect x="28" y="98" width="64" height="40" filter={`url(#${uid}-grain)`} opacity="0.6" />
        </g>
      </g>
    </svg>
  );
}

function Leaf({ x, y, rot, p }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <path
        d={`M${x},${y} C${x - 10},${y - 5} ${x - 10},${y - 20} ${x},${y - 24} C${x + 10},${y - 20} ${x + 10},${y - 5} ${x},${y} Z`}
        fill={p.leaf}
      />
      <path d={`M${x},${y} L${x},${y - 22}`} stroke={p.leafShade} strokeWidth="1.4" opacity="0.5" />
    </g>
  );
}

export default React.memo(StreakBloom);
