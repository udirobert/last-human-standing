import { useId } from "react";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as P } from "./gouachePalette.js";

/**
 * ProofScene — hand-painted gouache "proof" images for demo submissions.
 *
 * Replaces the off-brand Unsplash stock photos with on-brand SVG scenes
 * that match the art direction (docs/ART_DIRECTION.md). Each scene depicts
 * a daily theme location painted in the same gouache-on-paper style as
 * ThemeMotif, DozingCat, and CoffeeBrew.
 *
 * Used in the speedrun demo submissions and audit feed.
 *
 * Props:
 *   scene  — 'transit' | 'gym' | 'grocery' | 'beach' | 'eating' | 'cafe' | 'park' | 'default'
 *   width  — image width (default 400)
 *   height — image height (default 500)
 *   seed   — variation seed for subtle differences between submissions
 */

const SCENES = {
  transit: (uid, seed) => {
    const offset = (seed * 7) % 20;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* platform floor */}
        <rect x="0" y="320" width="400" height="180" fill={P.iron} opacity="0.8" />
        <rect x="0" y="320" width="400" height="20" fill={P.ironLight} opacity="0.5" />
        {/* train body */}
        <rect x="40" y="140" width="320" height="180" rx="20" fill={P.petal} />
        <rect x="40" y="140" width="320" height="50" rx="18" fill={P.petalShade} opacity="0.4" />
        {/* windows */}
        <rect x="70" y="180" width="80" height="50" rx="6" fill={P.espresso} opacity="0.7" />
        <rect x="170" y="180" width="80" height="50" rx="6" fill={P.espresso} opacity="0.7" />
        <rect x="270" y="180" width="80" height="50" rx="6" fill={P.espresso} opacity="0.7" />
        {/* door */}
        <rect x="200" y="240" width="40" height="80" rx="4" fill={P.terracottaShade} opacity="0.6" />
        {/* tracks */}
        <line x1="0" y1="340" x2="400" y2="340" stroke={P.crema} strokeWidth="2" opacity="0.3" />
        <line x1="0" y1="360" x2="400" y2="360" stroke={P.crema} strokeWidth="2" opacity="0.3" />
        {/* ceiling light */}
        <circle cx={200 + offset} cy="80" r="12" fill={P.sun} opacity="0.3" />
        <circle cx={200 + offset} cy="80" r="6" fill={P.sun} opacity="0.6" />
      </g>
    );
  },

  gym: (uid, seed) => {
    const offset = (seed * 11) % 30;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* floor */}
        <rect x="0" y="340" width="400" height="160" fill={P.cream} opacity="0.3" />
        {/* wall */}
        <rect x="0" y="0" width="400" height="340" fill={P.paper} opacity="0.15" />
        {/* rack */}
        <rect x="120" y="200" width="160" height="12" rx="3" fill={P.ironLight} />
        <rect x="100" y="180" width="14" height="60" rx="4" fill={P.iron} />
        <rect x="286" y="180" width="14" height="60" rx="4" fill={P.iron} />
        {/* barbell */}
        <rect x="80" y="195" width="240" height="8" rx="3" fill={P.iron} />
        <rect x="70" y="185" width="22" height="28" rx="5" fill={P.iron} />
        <rect x="308" y="185" width="22" height="28" rx="5" fill={P.iron} />
        {/* plates */}
        <circle cx="110" cy="199" r="20" fill={P.iron} opacity="0.8" />
        <circle cx="290" cy="199" r="20" fill={P.iron} opacity="0.8" />
        {/* mirror */}
        <rect x={250 + offset} y="60" width="100" height="140" rx="6" fill={P.water} opacity="0.2" />
        <rect x={250 + offset} y="60" width="100" height="140" rx="6" fill="none" stroke={P.cream} strokeWidth="3" opacity="0.4" />
      </g>
    );
  },

  grocery: (uid, seed) => {
    const offset = (seed * 13) % 25;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* shelf */}
        <rect x="0" y="100" width="400" height="8" fill={P.crema} opacity="0.6" />
        <rect x="0" y="220" width="400" height="8" fill={P.crema} opacity="0.6" />
        {/* produce — tomatoes */}
        <circle cx="60" cy="140" r="18" fill={P.terracotta} />
        <circle cx="100" cy="145" r="16" fill={P.terracottaShade} />
        <circle cx="140" cy="138" r="18" fill={P.terracotta} />
        {/* produce — greens */}
        <ellipse cx="220" cy="145" rx="22" ry="14" fill={P.leaf} />
        <ellipse cx="260" cy="140" rx="20" ry="12" fill={P.leafShade} />
        {/* paper bag */}
        <path d="M300,120 L360,120 L355,200 C355,205 305,205 305,200 Z" fill={P.cream} />
        <path d="M300,120 L360,120 L355,200 C355,205 305,205 305,200 Z" fill={P.paper} opacity="0.3" />
        {/* shelf items — jars */}
        <rect x="50" y="250" width="30" height="50" rx="4" fill={P.petal} opacity="0.7" />
        <rect x="90" y="250" width="30" height="50" rx="4" fill={P.leaf} opacity="0.6" />
        <rect x="130" y="250" width="30" height="50" rx="4" fill={P.terracotta} opacity="0.7" />
        {/* cart handle */}
        <rect x={200 + offset} y="280" width="120" height="6" rx="3" fill={P.iron} />
        <circle cx={210 + offset} cy="320" r="12" fill={P.iron} />
        <circle cx={310 + offset} cy="320" r="12" fill={P.iron} />
      </g>
    );
  },

  beach: (uid, seed) => {
    const offset = (seed * 17) % 40;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* sky */}
        <rect x="0" y="0" width="400" height="280" fill={P.petal} opacity="0.15" />
        {/* sun */}
        <circle cx={300 + offset} cy="80" r="30" fill={P.sun} opacity="0.5" />
        <circle cx={300 + offset} cy="80" r="18" fill={P.sun} opacity="0.7" />
        {/* sea */}
        <path d="M0,260 C80,250 160,270 240,260 C320,250 360,265 400,258 L400,360 L0,360 Z" fill={P.water} />
        {/* waves */}
        <path d="M0,270 C80,260 160,280 240,270 C320,260 360,275 400,268" fill="none" stroke={P.foam} strokeWidth="3" opacity="0.6" />
        {/* sand */}
        <path d="M0,340 C80,335 160,345 240,338 C320,333 360,343 400,336 L400,500 L0,500 Z" fill={P.cream} opacity="0.6" />
        <path d="M0,340 C80,335 160,345 240,338 C320,333 360,343 400,336" fill="none" stroke={P.rim} strokeWidth="2" opacity="0.3" />
        {/* paper boat */}
        <g transform="translate(150, 310)">
          <path d="M0,0 L40,0 L32,12 L8,12 Z" fill={P.foam} />
          <path d="M20,0 L20,-20 L36,0 Z" fill={P.cream} />
          <path d="M18,0 L18,-20 L2,0 Z" fill={P.paper} />
        </g>
      </g>
    );
  },

  eating: (uid, seed) => {
    const offset = (seed * 19) % 20;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* table */}
        <rect x="0" y="300" width="400" height="200" fill={P.crema} opacity="0.3" />
        {/* steam */}
        <g fill="none" stroke={P.foam} strokeWidth="3" strokeLinecap="round" opacity="0.5">
          <path d="M170,180 C165,165 175,160 170,145" />
          <path d="M200,180 C205,165 195,160 200,145" />
          <path d="M230,180 C225,165 235,160 230,145" />
        </g>
        {/* bowl */}
        <path d="M140,220 C145,290 255,290 260,220 Z" fill={P.cream} />
        <ellipse cx="200" cy="220" rx="60" ry="14" fill={P.rim} />
        <ellipse cx="200" cy="220" rx="50" ry="10" fill={P.bud} />
        {/* noodles */}
        <path d="M175,218 C185,210 215,210 225,218" fill="none" stroke={P.foam} strokeWidth="3" />
        <path d="M180,222 C190,214 210,214 220,222" fill="none" stroke={P.foam} strokeWidth="2.5" />
        {/* garnish */}
        <circle cx="190" cy="218" r="4" fill={P.leaf} />
        <circle cx="210" cy="220" r="3" fill={P.leaf} />
        {/* chopsticks */}
        <line x1={280 + offset} y1="180" x2="320" y2="240" stroke={P.crema} strokeWidth="4" strokeLinecap="round" />
        <line x1={290 + offset} y1="180" x2="330" y2="240" stroke={P.crema} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  },

  cafe: (uid, seed) => {
    const offset = (seed * 23) % 15;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* table */}
        <rect x="0" y="320" width="400" height="180" fill={P.crema} opacity="0.25" />
        {/* steam */}
        <g fill="none" stroke={P.foam} strokeWidth="3" strokeLinecap="round" opacity="0.5">
          <path d="M180,200 C175,185 185,180 180,165" />
          <path d="M200,200 C205,185 195,180 200,165" />
          <path d="M220,200 C215,185 225,180 220,165" />
        </g>
        {/* mug */}
        <path d="M160,230 C160,230 162,290 172,300 C180,308 240,308 248,300 C258,290 260,230 260,230 Z" fill={P.cream} />
        <path d="M260,240 C285,235 287,275 260,273 L260,265 C272,267 272,247 260,251 Z" fill={P.handle} />
        <ellipse cx="210" cy="230" rx="50" ry="13" fill={P.rim} />
        <ellipse cx="210" cy="231" rx="42" ry="10" fill={P.espresso} />
        {/* saucer */}
        <ellipse cx="210" cy="315" rx="70" ry="12" fill={P.creamShade} opacity="0.5" />
        {/* window light */}
        <rect x={20 + offset} y="40" width="80" height="120" rx="6" fill={P.sun} opacity="0.08" />
        <rect x={20 + offset} y="40" width="80" height="120" rx="6" fill="none" stroke={P.cream} strokeWidth="2" opacity="0.2" />
      </g>
    );
  },

  park: (uid, seed) => {
    const offset = (seed * 29) % 30;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* sky */}
        <rect x="0" y="0" width="400" height="300" fill={P.sun} opacity="0.05" />
        {/* grass */}
        <path d="M0,300 C80,290 160,310 240,300 C320,290 360,305 400,298 L400,500 L0,500 Z" fill={P.leaf} opacity="0.5" />
        <path d="M0,320 C80,310 160,330 240,320 C320,310 360,325 400,318 L400,500 L0,500 Z" fill={P.leafShade} opacity="0.4" />
        {/* tree trunk */}
        <rect x="80" y="200" width="20" height="120" rx="4" fill={P.crema} />
        {/* tree canopy */}
        <circle cx="90" cy="170" r="45" fill={P.leaf} />
        <circle cx="60" cy="185" r="30" fill={P.leaf} />
        <circle cx="120" cy="180" r="28" fill={P.leafShade} opacity="0.5" />
        {/* bench */}
        <rect x={200 + offset} y="280" width="120" height="8" rx="3" fill={P.ironLight} />
        <rect x={210 + offset} y="288" width="6" height="30" fill={P.iron} />
        <rect x={304 + offset} y="288" width="6" height="30" fill={P.iron} />
        <rect x={200 + offset} y="260" width="120" height="6" rx="2" fill={P.ironLight} opacity="0.7" />
      </g>
    );
  },

  default: (uid, seed) => {
    const offset = (seed * 31) % 20;
    return (
      <g filter={`url(#${uid}-brush)`}>
        {/* warm room backdrop */}
        <rect x="0" y="0" width="400" height="500" fill={P.paper} opacity="0.1" />
        {/* table */}
        <rect x="0" y="340" width="400" height="160" fill={P.cream} opacity="0.2" />
        {/* coffee mug — the human ritual */}
        <path d="M160,260 C160,260 162,320 172,330 C180,338 240,338 248,330 C258,320 260,260 260,260 Z" fill={P.cream} />
        <ellipse cx="210" cy="260" rx="50" ry="13" fill={P.rim} />
        <ellipse cx="210" cy="261" rx="42" ry="10" fill={P.espresso} />
        {/* steam */}
        <g fill="none" stroke={P.foam} strokeWidth="3" strokeLinecap="round" opacity="0.4">
          <path d="M190,230 C185,215 195,210 190,195" />
          <path d="M210,230 C215,215 205,210 210,195" />
          <path d="M230,230 C225,215 235,210 230,195" />
        </g>
        {/* warm glow */}
        <circle cx={200 + offset} cy="120" r="60" fill={P.sun} opacity="0.06" />
      </g>
    );
  },
};

export default function ProofScene({ scene = "default", seed = 0, width = 400, height = 500, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const draw = SCENES[scene] || SCENES.default;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`a hand-painted ${scene} scene`}
    >
      <defs>
        <GouacheFilters id={uid} />
        <clipPath id={`${uid}-scene`}>
          <rect x="0" y="0" width={width} height={height} />
        </clipPath>
      </defs>
      {/* warm dark room backdrop */}
      <rect x="0" y="0" width={width} height={height} fill="#1a120c" />
      <rect x="0" y="0" width={width} height={height} fill={P.paper} opacity="0.06" />
      {/* the scene */}
      {draw(uid, seed)}
      {/* paper grain over everything */}
      <g clipPath={`url(#${uid}-scene)`}>
        <rect x="0" y="0" width={width} height={height} filter={`url(#${uid}-grain)`} opacity="0.3" />
      </g>
    </svg>
  );
}
