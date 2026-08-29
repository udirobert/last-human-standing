import { useId, memo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import GouacheFilters from "./GouacheFilters.jsx";
import { GOUACHE as P } from "./gouachePalette.js";

/**
 * PioneerArtifactArt — The master collectible artwork for the Founding 100 Pioneer Pass.
 * Unifies the core motifs of Last Human Standing:
 * - Central Gouache Compass & Survivor Flame
 * - The 5 Daily Ritual Artifacts (Coffee, Tree, Iron, Transit, Sunrise)
 * - The Watchful Mascot Silhouette
 * - Hand-painted paper grain & brush wobble filters
 * - Dynamic 3D gyro/mouse tilt reflection
 */
function PioneerArtifactArt({ serialNumber = 42, totalEdition = 100, stamped = false, className = "" }) {
  const filterId = useId().replace(/:/g, "_");

  // Interactive 3D tilt tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const formattedNum = String(serialNumber).padStart(3, "0");

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-amber/40 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.7)] bg-[#12100E] select-none ${className}`}
    >
      {/* 3D Glare Sheen Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-20 opacity-35 mix-blend-overlay"
        style={{
          background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,230,160,0.65) 0%, transparent 65%)`,
        }}
      />

      <svg
        viewBox="0 0 400 500"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <GouacheFilters id={filterId} />
          {/* Radial ambient background */}
          <radialGradient id={`${filterId}-bg-grad`} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#2A2016" />
            <stop offset="60%" stopColor="#16120E" />
            <stop offset="100%" stopColor="#0B0908" />
          </radialGradient>
          {/* Gold foil gradient */}
          <linearGradient id={`${filterId}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE89E" />
            <stop offset="45%" stopColor="#FFB800" />
            <stop offset="85%" stopColor="#D98200" />
            <stop offset="100%" stopColor="#8A4E00" />
          </linearGradient>
        </defs>

        {/* Background Card Paper */}
        <rect width="400" height="500" rx="24" fill={`url(#${filterId}-bg-grad)`} />

        {/* Paper Grain Overlay */}
        <rect
          x="10"
          y="10"
          width="380"
          height="480"
          rx="18"
          fill="none"
          stroke="rgba(255,184,0,0.25)"
          strokeWidth="1.5"
          filter={`url(#${filterId}-grain)`}
          opacity="0.45"
        />

        {/* Intricate Inner Border Frame */}
        <rect
          x="20"
          y="20"
          width="360"
          height="460"
          rx="14"
          fill="none"
          stroke={`url(#${filterId}-gold)`}
          strokeWidth="1.2"
          strokeDasharray="6 3"
          opacity="0.65"
        />

        {/* Corner Flourishes */}
        <path d="M 24 38 L 38 24 M 24 32 L 32 24" stroke="#FFB800" strokeWidth="1.5" opacity="0.6" />
        <path d="M 376 38 L 362 24 M 376 32 L 368 24" stroke="#FFB800" strokeWidth="1.5" opacity="0.6" />
        <path d="M 24 462 L 38 476 M 24 468 L 32 476" stroke="#FFB800" strokeWidth="1.5" opacity="0.6" />
        <path d="M 376 462 L 362 476 M 376 468 L 368 476" stroke="#FFB800" strokeWidth="1.5" opacity="0.6" />

        {/* Header Ribbon */}
        <text
          x="200"
          y="58"
          textAnchor="middle"
          fill="#FFB800"
          fontFamily="ui-monospace, monospace"
          fontSize="9.5"
          letterSpacing="0.28em"
          fontWeight="bold"
        >
          LAST HUMAN STANDING
        </text>
        <text
          x="200"
          y="74"
          textAnchor="middle"
          fill="#EDE4D0"
          fontFamily="ui-monospace, monospace"
          fontSize="7.5"
          letterSpacing="0.16em"
          opacity="0.6"
        >
          FOUNDING PIONEER · EDITION OF {totalEdition}
        </text>

        {/* Main Artwork Group with Brush Wobble */}
        <g filter={`url(#${filterId}-brush)`}>
          {/* Outer Dial Rings */}
          <circle cx="200" cy="225" r="105" fill="none" stroke="#2D2319" strokeWidth="12" />
          <circle cx="200" cy="225" r="98" fill="#1C1611" stroke="#FFB800" strokeWidth="1" opacity="0.8" />
          <circle cx="200" cy="225" r="82" fill="#120E0B" stroke="#4A341E" strokeWidth="1.5" />

          {/* Compass Rose Starburst */}
          <path
            d="M 200 135 L 208 215 L 290 225 L 208 235 L 200 315 L 192 235 L 110 225 L 192 215 Z"
            fill={`url(#${filterId}-gold)`}
            opacity="0.85"
          />
          <path
            d="M 200 160 L 205 220 L 265 225 L 205 230 L 200 290 L 195 230 L 135 225 L 195 220 Z"
            fill="#FFF2CC"
            opacity="0.9"
          />

          {/* Core Survivor Hearth (Gouache Flame) */}
          <ellipse cx="200" cy="225" r="32" fill="#FF1A1A" opacity="0.85" />
          <circle cx="200" cy="225" r="22" fill="#FFB800" />
          <circle cx="200" cy="225" r="12" fill="#FFFFFF" />

          {/* The 5 Master Ritual Motifs circling the Compass */}
          {/* 1. Coffee Cup (Top) */}
          <g transform="translate(186, 92) scale(0.24)">
            <rect x="10" y="25" width="38" height="42" rx="10" fill={P.crema} />
            <path d="M 48 35 C 58 35 58 55 48 55" fill="none" stroke={P.crema} strokeWidth="5" />
            <ellipse cx="29" cy="25" rx="19" ry="6" fill={P.roast} />
          </g>

          {/* 2. Park Tree (Top Right) */}
          <g transform="translate(290, 140) scale(0.24)">
            <rect x="26" y="45" width="8" height="25" rx="3" fill={P.crema} />
            <circle cx="30" cy="32" r="22" fill={P.leaf} />
            <circle cx="16" cy="38" r="14" fill={P.leafShade} opacity="0.8" />
          </g>

          {/* 3. Gym Iron (Bottom Right) */}
          <g transform="translate(285, 280) scale(0.22) rotate(-20 30 30)">
            <rect x="10" y="26" width="44" height="8" rx="3" fill={P.ironLight} />
            <rect x="6" y="18" width="8" height="24" rx="3" fill={P.iron} />
            <rect x="50" y="18" width="8" height="24" rx="3" fill={P.iron} />
          </g>

          {/* 4. Transit Ticket/Window (Bottom Left) */}
          <g transform="translate(80, 280) scale(0.24)">
            <rect x="10" y="15" width="44" height="34" rx="6" fill={P.crema} stroke={P.iron} strokeWidth="2" />
            <line x1="20" y1="15" x2="20" y2="49" stroke={P.ironLight} strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="35" cy="32" r="6" fill={P.amber} />
          </g>

          {/* 5. Sunrise Mountain Horizon (Top Left) */}
          <g transform="translate(85, 140) scale(0.24)">
            <circle cx="30" cy="40" r="18" fill="#FFB800" />
            <polygon points="10,50 30,22 50,50" fill={P.iron} />
            <polygon points="25,50 42,28 60,50" fill={P.ironLight} opacity="0.8" />
          </g>

          {/* Mascot Silhouette Standing on North Compass */}
          <g transform="translate(187, 185) scale(0.28)">
            {/* Body */}
            <circle cx="45" cy="35" r="24" fill="#0B0908" />
            <rect x="33" y="48" width="24" height="28" rx="8" fill="#0B0908" />
            {/* Watchful Glowing Eyes */}
            <circle cx="38" cy="33" r="4.5" fill="#FFB800" />
            <circle cx="52" cy="33" r="4.5" fill="#FFB800" />
            <circle cx="39.5" cy="32.5" r="2" fill="#FFFFFF" />
            <circle cx="53.5" cy="32.5" r="2" fill="#FFFFFF" />
          </g>
        </g>

        {/* Card Footer: Metadata & Numbering */}
        <rect x="35" y="375" width="330" height="85" rx="16" fill="#18130E" stroke="#38291A" strokeWidth="1" />

        <text x="55" y="402" fill="#FFB800" fontFamily="ui-monospace, monospace" fontSize="8" letterSpacing="0.18em" uppercase="true">
          PROVENANCE
        </text>
        <text x="55" y="418" fill="#EDE4D0" fontFamily="ui-monospace, monospace" fontSize="10.5" fontWeight="600">
          CELO MAINNET · WORLD CHAIN
        </text>
        <text x="55" y="438" fill="#888888" fontFamily="ui-monospace, monospace" fontSize="8" letterSpacing="0.08em">
          ZK PROOF OF PRESENCE · VERIFIED PLAYTESTER
        </text>

        {/* Stamped Number Pill */}
        <rect x="260" y="392" width="90" height="36" rx="10" fill="#0E0B08" stroke="#FFB800" strokeWidth="1.2" />
        <text
          x="305"
          y="415"
          textAnchor="middle"
          fill="#FFB800"
          fontFamily="ui-monospace, monospace"
          fontSize="14"
          fontWeight="bold"
          letterSpacing="0.06em"
        >
          #{formattedNum}
        </text>
        <text x="305" y="424" textAnchor="middle" fill="#888888" fontFamily="ui-monospace, monospace" fontSize="6.5">
          OF {totalEdition}
        </text>
      </svg>

      {/* Real Wax Stamp (Appears with Slam Animation on Claim) */}
      {stamped && (
        <motion.div
          initial={{ scale: 2.8, opacity: 0, rotate: -35 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ type: "spring", stiffness: 380, damping: 22, mass: 0.8 }}
          className="absolute right-6 bottom-24 z-30 pointer-events-none"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blood via-[#9e1010] to-[#590808] border-2 border-amber shadow-[0_8px_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center text-center p-1 transform rotate-[-8deg]">
            <span className="text-amber text-xs leading-none select-none">🎖️</span>
            <span className="font-mono text-[8px] font-black tracking-widest text-bone uppercase mt-0.5">
              SEALED
            </span>
            <span className="font-mono text-[6.5px] text-amber/90 font-bold uppercase tracking-wider">
              PIONEER
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(PioneerArtifactArt);
