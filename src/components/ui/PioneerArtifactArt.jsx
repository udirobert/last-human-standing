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
function PioneerArtifactArt({
  serialNumber = 42,
  totalEdition = 100,
  stamped = false,
  ecosystem = "celo",
  className = "",
}) {
  const filterId = useId().replace(/:/g, "_");
  const isWorld = ecosystem === "world" || ecosystem === "worldchain";

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
  const artworkSrc = isWorld ? "/motifs/pioneer-artifact-world.jpg" : "/motifs/pioneer-artifact-celo.jpg";

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-[4/5] rounded-3xl overflow-hidden border ${isWorld ? 'border-neon/40 shadow-[0_24px_60px_-16px_rgba(0,255,148,0.2)]' : 'border-amber/40 shadow-[0_24px_60px_-16px_rgba(255,184,0,0.25)]'} bg-[#12100E] select-none ${className}`}
    >
      {/* 3D Glare Sheen Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-20 opacity-35 mix-blend-overlay"
        style={{
          background: isWorld
            ? `radial-gradient(circle at ${glareX} ${glareY}, rgba(0,255,148,0.5) 0%, transparent 65%)`
            : `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,230,160,0.65) 0%, transparent 65%)`,
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
            <stop offset="0%" stopColor={isWorld ? "#102318" : "#2A2016"} />
            <stop offset="60%" stopColor="#16120E" />
            <stop offset="100%" stopColor="#0B0908" />
          </radialGradient>
          {/* Gold / Neon foil gradient */}
          <linearGradient id={`${filterId}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isWorld ? "#A3FFD8" : "#FFE89E"} />
            <stop offset="45%" stopColor={isWorld ? "#00FF94" : "#FFB800"} />
            <stop offset="85%" stopColor={isWorld ? "#00B368" : "#D98200"} />
            <stop offset="100%" stopColor={isWorld ? "#005E36" : "#8A4E00"} />
          </linearGradient>
        </defs>

        {/* Background Card Paper */}
        <rect width="400" height="500" rx="24" fill={`url(#${filterId}-bg-grad)`} />

        {/* Master Gouache Artwork Canvas */}
        <g clipPath={`url(#${filterId}-card-clip)`}>
          <clipPath id={`${filterId}-card-clip`}>
            <rect x="14" y="14" width="372" height="472" rx="20" />
          </clipPath>
          <image
            href={artworkSrc}
            x="14"
            y="14"
            width="372"
            height="472"
            preserveAspectRatio="xMidYMid slice"
            opacity="0.94"
          />
          {/* Subtle Dark Vignette on Artwork */}
          <rect
            x="14"
            y="14"
            width="372"
            height="472"
            fill="url(#vignette-grad)"
            opacity="0.65"
          />
          <radialGradient id="vignette-grad" cx="50%" cy="45%" r="60%">
            <stop offset="35%" stopColor="transparent" />
            <stop offset="100%" stopColor="#0B0908" />
          </radialGradient>
        </g>

        {/* Paper Grain Overlay */}
        <rect
          x="10"
          y="10"
          width="380"
          height="480"
          rx="18"
          fill="none"
          stroke={isWorld ? "rgba(0,255,148,0.3)" : "rgba(255,184,0,0.3)"}
          strokeWidth="1.5"
          filter={`url(#${filterId}-grain)`}
          opacity="0.35"
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
          opacity="0.75"
        />

        {/* Corner Flourishes */}
        <path d="M 24 38 L 38 24 M 24 32 L 32 24" stroke={isWorld ? "#00FF94" : "#FFB800"} strokeWidth="1.5" opacity="0.75" />
        <path d="M 376 38 L 362 24 M 376 32 L 368 24" stroke={isWorld ? "#00FF94" : "#FFB800"} strokeWidth="1.5" opacity="0.75" />
        <path d="M 24 462 L 38 476 M 24 468 L 32 476" stroke={isWorld ? "#00FF94" : "#FFB800"} strokeWidth="1.5" opacity="0.75" />
        <path d="M 376 462 L 362 476 M 376 468 L 368 476" stroke={isWorld ? "#00FF94" : "#FFB800"} strokeWidth="1.5" opacity="0.75" />

        {/* Header Ribbon with Dark Backing */}
        <rect x="50" y="38" width="300" height="42" rx="12" fill="rgba(14,11,8,0.75)" stroke={isWorld ? "rgba(0,255,148,0.4)" : "rgba(255,184,0,0.4)"} strokeWidth="0.8" backdropFilter="blur(4px)" />
        <text
          x="200"
          y="56"
          textAnchor="middle"
          fill={isWorld ? "#00FF94" : "#FFB800"}
          fontFamily="ui-monospace, monospace"
          fontSize="9.5"
          letterSpacing="0.26em"
          fontWeight="bold"
        >
          {isWorld ? "WORLD CHAIN · PIONEER" : "CELO MAINNET · PIONEER"}
        </text>
        <text
          x="200"
          y="70"
          textAnchor="middle"
          fill="#EDE4D0"
          fontFamily="ui-monospace, monospace"
          fontSize="7.5"
          letterSpacing="0.16em"
          opacity="0.75"
        >
          {isWorld ? "WORLD ID ORB ALLOCATION · 1 OF 50" : "SELF ZK ALLOCATION · 1 OF 50"}
        </text>

        {/* Card Footer: Metadata & Numbering */}
        <rect x="30" y="385" width="340" height="78" rx="14" fill="rgba(14,11,8,0.85)" stroke="#38291A" strokeWidth="1" />

        <text x="48" y="408" fill={isWorld ? "#00FF94" : "#FFB800"} fontFamily="ui-monospace, monospace" fontSize="7.5" letterSpacing="0.18em" uppercase="true">
          PROVENANCE
        </text>
        <text x="48" y="424" fill="#EDE4D0" fontFamily="ui-monospace, monospace" fontSize="9.5" fontWeight="600">
          {isWorld ? "WORLD CHAIN · WORLD ID NULLIFIER" : "CELO MAINNET · SELF ZK PASSPORT"}
        </text>
        <text x="48" y="442" fill="#888888" fontFamily="ui-monospace, monospace" fontSize="7.5" letterSpacing="0.08em">
          SOULBOUND PROOF OF HUMAN PRESENCE
        </text>

        {/* Stamped Number Pill */}
        <rect x="264" y="398" width="92" height="34" rx="8" fill="#0B0907" stroke={isWorld ? "#00FF94" : "#FFB800"} strokeWidth="1.2" />
        <text
          x="310"
          y="419"
          textAnchor="middle"
          fill={isWorld ? "#00FF94" : "#FFB800"}
          fontFamily="ui-monospace, monospace"
          fontSize="13"
          fontWeight="bold"
          letterSpacing="0.06em"
        >
          #{formattedNum}
        </text>
        <text x="310" y="427" textAnchor="middle" fill="#888888" fontFamily="ui-monospace, monospace" fontSize="6">
          OF 100
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
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${
            isWorld
              ? 'from-[#003d22] via-[#006e3e] to-[#00aa5f] border-2 border-neon'
              : 'from-blood via-[#9e1010] to-[#590808] border-2 border-amber'
          } shadow-[0_8px_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center text-center p-1 transform rotate-[-8deg]`}>
            <span className="text-xs leading-none select-none">{isWorld ? "👁️" : "🌿"}</span>
            <span className="font-mono text-[8px] font-black tracking-widest text-bone uppercase mt-0.5">
              SEALED
            </span>
            <span className={`font-mono text-[6.5px] ${isWorld ? 'text-neon' : 'text-amber'} font-bold uppercase tracking-wider`}>
              {isWorld ? "WORLD ID" : "CELO/SELF"}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(PioneerArtifactArt);
