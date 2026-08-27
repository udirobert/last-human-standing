import { memo, useId } from "react";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as PALETTE } from "./gouachePalette.js";

/**
 * CoffeeBrew — the first "proof of presence" motif (see docs/ART_DIRECTION.md).
 *
 * A hand-painted mug of coffee with rising steam. Coffee is the human ritual at
 * the heart of the game — check-in — and "AT A CAFÉ" is already a live daily
 * theme. This is the CALIBRATION piece: every other artefact is drawn to match
 * its hand — the shared gouache material lives in GouacheFilters.jsx /
 * gouachePalette.js.
 *
 * Steam animates via .steam-a/b/c (index.css) and freezes under
 * prefers-reduced-motion. No deps.
 */

const CUP_PATH = "M34,72 C34,72 36,118 45,131 C53,141 87,141 95,131 C104,118 106,72 106,72 Z";
const HANDLE_PATH = "M104,80 C132,74 134,116 104,114 L104,104 C120,106 120,86 104,90 Z";

function CoffeeBrew({ size = 140, className = "", "aria-label": ariaLabel = "a fresh cup of coffee" }) {
  const uid = useId().replace(/:/g, "");
  const brush = `${uid}-brush`;
  const grain = `${uid}-grain`;
  const soft = `${uid}-soft`;
  const shadow = `${uid}-shadow`;
  const glow = `${uid}-glow`;
  const matClip = `${uid}-mat`;
  const cupClip = `${uid}-cup`;

  return (
    <svg
      width={size}
      height={size * (160 / 140)}
      viewBox="0 0 140 160"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <GouacheFilters id={uid} />
        <radialGradient id={glow} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#FFB800" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FFB800" stopOpacity="0" />
        </radialGradient>
        <clipPath id={matClip}><ellipse cx="70" cy="132" rx="46" ry="14" /></clipPath>
        <clipPath id={cupClip}><path d={CUP_PATH} /></clipPath>
      </defs>

      {/* warm glow + grounding paper mat */}
      <rect x="0" y="0" width="140" height="160" fill={`url(#${glow})`} />
      <g filter={`url(#${brush})`}>
        <ellipse cx="70" cy="132" rx="46" ry="14" fill={PALETTE.cream} opacity="0.14" />
        <g clipPath={`url(#${matClip})`}>
          <rect x="20" y="112" width="100" height="40" filter={`url(#${grain})`} opacity="0.5" />
        </g>
      </g>
      <ellipse cx="70" cy="140" rx="40" ry="9" fill="#000" opacity="0.45" filter={`url(#${shadow})`} />

      {/* steam */}
      <g fill="none" stroke={PALETTE.steam} strokeWidth="4" strokeLinecap="round" filter={`url(#${soft})`}>
        <path className="steam-a" d="M60,60 C52,50 68,46 60,34 C55,26 66,20 61,10" />
        <path className="steam-b" d="M78,60 C86,50 72,46 80,34 C85,26 74,20 79,10" />
        <path className="steam-c" d="M70,58 C64,48 76,44 70,32 C66,24 74,18 70,10" />
      </g>

      {/* the mug */}
      <g filter={`url(#${brush})`}>
        <path d={HANDLE_PATH} fill={PALETTE.handle} />
        <path d={HANDLE_PATH} fill={PALETTE.creamShade} opacity="0.35" />
        <path d={CUP_PATH} fill={PALETTE.cream} />
        <path
          d="M70,72 C70,72 92,73 106,72 C106,72 104,118 95,131 C90,136 80,139 72,140 Z"
          fill={PALETTE.creamShade}
          opacity="0.55"
        />
        <ellipse cx="70" cy="72" rx="36" ry="9.5" fill={PALETTE.rim} />
        <ellipse cx="70" cy="72.5" rx="30" ry="7.2" fill={PALETTE.espresso} />
        <ellipse cx="70" cy="72" rx="30" ry="7.2" fill="none" stroke={PALETTE.crema} strokeWidth="2.4" opacity="0.7" />
        <ellipse cx="64" cy="70.5" rx="9" ry="2.4" fill={PALETTE.espressoHi} opacity="0.6" />
        <g clipPath={`url(#${cupClip})`}>
          <rect x="30" y="66" width="80" height="80" filter={`url(#${grain})`} opacity="0.72" />
        </g>
      </g>
    </svg>
  );
}

export default memo(CoffeeBrew);
