import { useId } from "react";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as P } from "./gouachePalette.js";

/**
 * DozingCat — the third "proof of presence" motif (docs/ART_DIRECTION.md).
 *
 * A curled, sleeping ginger cat for the lonely dwell moments — the spectator
 * "you have no slot, just watch" state. It says *you're not alone here*. New
 * register (companionship, a living creature), new motion (a slow breath, not
 * steam or sway), same hand (shared GouacheFilters + palette).
 *
 * Breathing freezes under prefers-reduced-motion (.cat-breathe, index.css).
 */
export default function DozingCat({ size = 120, className = "", title = "a sleeping cat, keeping you company" }) {
  const uid = useId().replace(/:/g, "");
  const bodyPath =
    "M24,60 C24,38 50,28 80,30 C108,32 122,46 122,64 C122,82 100,90 68,90 C40,90 24,80 24,60 Z";

  return (
    <svg
      width={size}
      height={size * (100 / 140)}
      viewBox="0 0 140 100"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <GouacheFilters id={uid} />
        <clipPath id={`${uid}-body`}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      <ellipse cx="72" cy="92" rx="52" ry="7" fill="#000" opacity="0.4" filter={`url(#${uid}-shadow)`} />

      <g className="cat-breathe" filter={`url(#${uid}-brush)`}>
        {/* tail curling around the front — sways softly in sleep (.cat-tail) */}
        <g className="cat-tail">
          <path d="M116,66 C126,84 104,96 74,90" fill="none" stroke={P.catShade} strokeWidth="13" strokeLinecap="round" />
        </g>
        {/* body */}
        <path d={bodyPath} fill={P.catBody} />
        <path
          d="M80,30 C108,32 122,46 122,64 C122,78 106,86 84,89 C104,82 112,68 108,54 C104,42 92,34 80,30 Z"
          fill={P.catShade}
          opacity="0.4"
        />
        {/* tabby stripes */}
        <g stroke={P.catMark} strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round">
          <path d="M78,34 C82,42 82,52 78,60" />
          <path d="M92,36 C97,45 97,56 92,64" />
          <path d="M104,42 C109,50 109,60 104,68" />
        </g>
        {/* head */}
        <circle cx="40" cy="58" r="20" fill={P.catBody} />
        {/* ears */}
        <path d="M24,50 L28,30 L44,44 Z" fill={P.catBody} />
        <path d="M24,50 L28,34 L38,44 Z" fill={P.catEar} />
        <path d="M40,42 L54,30 L58,50 Z" fill={P.catBody} />
        <path d="M44,44 L53,35 L56,49 Z" fill={P.catEar} />
        {/* muzzle + closed eye + nose */}
        <ellipse cx="30" cy="64" rx="12" ry="9" fill={P.cream} opacity="0.85" />
        <path d="M26,57 C30,61 38,61 42,57" fill="none" stroke={P.espressoHi} strokeWidth="2" strokeLinecap="round" />
        <path d="M22,63 L28,63 L25,67 Z" fill={P.catMark} />
        {/* tucked paw */}
        <ellipse cx="52" cy="87" rx="10" ry="4.5" fill={P.cream} />
        {/* paper grain */}
        <g clipPath={`url(#${uid}-body)`}>
          <rect x="24" y="28" width="100" height="64" filter={`url(#${uid}-grain)`} opacity="0.55" />
        </g>
      </g>
    </svg>
  );
}

export default React.memo(DozingCat);
