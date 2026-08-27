import { motion } from "framer-motion";
import { isoFaces } from "./isometric-shade.js";

/**
 * IsometricCamp — a single isometric "camp" element representing a player.
 *
 * Design constraints (resolved from the proposal review):
 *
 * 1. POSITION-AGNOSTIC. This component does NOT take x/y or set left/top.
 *    Its root carries `data-dot`, so PopulationField's existing rAF loop
 *    positions it via `el.style.transform = translate(x%, y%)` exactly as it
 *    positions the dots. The camp slots INTO the current animation model;
 *    it does not introduce a second one.
 *
 * 2. NO TRANSFORM CONFLICT. The rAF owns `transform` on the root. The root
 *    only animates `opacity` (framer-motion), so framer-motion never writes
 *    `transform` here and never fights the rAF. The campfire glow uses CSS
 *    keyframes (no SMIL <animate>); the global reduced-motion rule caps it.
 *
 * 3. POSITIONING PARITY. The root is sized to `anchorSize` (the dot's px
 *    size) so `translate(%, %)` — which is element-size-relative — moves the
 *    camp by the same amount as the dot it replaces. The camp SVG is larger
 *    and centered on the anchor via the SVG's OWN transform.
 *
 *   alive   → warm ember campfire (three-tone iso tile + CSS glow)
 *   winner  → bright golden fire (faster, brighter glow)
 *   dead    → cold ash-gray ghost ring (reuses PopulationField's ghost pattern)
 */
export default function IsometricCamp({
  alive = true,
  isWinner = false,
  isEliminated = false,
  anchorSize = 4,
  visualSize = 16,
  baseOpacity = 0.55,
  ghostColor = "#F4B84A",
  reduce = false,
  delay = 0,
}) {
  const baseColor = isWinner ? "#FFB800" : alive ? "#F4B84A" : "#3a2a1e";
  const faces = isoFaces(baseColor, isWinner ? 0.7 : 0.55, isWinner ? 1.3 : 1.2);

  const w = visualSize * 2;
  const h = visualSize * 1.4;
  const cx = visualSize;
  const topY = visualSize * 0.1;
  const midY = visualSize * 0.7;
  const botY = visualSize * 1.3;
  const leftX = visualSize * 0.1;
  const rightX = visualSize * 1.9;

  const glowOpacity = isWinner ? 0.65 : alive ? 0.4 : 0;
  const glowR = isWinner ? visualSize * 0.4 : visualSize * 0.34;
  const glowDuration = isWinner ? 2 : 3;

  return (
    <>
      {/* Eliminated ghost ring — faint persistent echo. NOT data-dot, so the
          rAF leaves it in place; framer-motion owns its opacity/scale. */}
      {isEliminated && (
        <motion.span
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          className="absolute rounded-full"
          style={{
            width: anchorSize * 2.5,
            height: anchorSize * 2.5,
            border: `1px solid ${ghostColor}30`,
            left: 0,
            top: 0,
            marginLeft: -anchorSize * 0.75,
            marginTop: -anchorSize * 0.75,
          }}
        />
      )}

      {/* Camp — the data-dot anchor. rAF sets transform: translate(x%, y%).
          Only opacity animates here, so framer-motion never touches transform
          and the rAF has sole ownership of it. */}
      <motion.div
        data-dot
        initial={{ opacity: 0 }}
        animate={{ opacity: baseOpacity }}
        transition={{ duration: alive ? 0.8 : 1.5, ease: "easeOut", delay }}
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: anchorSize,
          height: anchorSize,
          willChange: reduce ? undefined : "transform",
        }}
      >
        {(alive || isWinner) && (
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              overflow: "visible",
            }}
          >
            {/* Top face — base color */}
            <polygon
              points={`${cx},${topY} ${rightX},${midY} ${cx},${botY} ${leftX},${midY}`}
              fill={faces.top}
              stroke="rgba(231,221,198,0.08)"
              strokeWidth="0.5"
            />
            {/* Left face — lit (sun from front-left) */}
            <polygon
              points={`${cx},${midY} ${leftX},${midY} ${leftX},${visualSize} ${cx},${botY}`}
              fill={faces.left}
              stroke="none"
            />
            {/* Right face — shadow */}
            <polygon
              points={`${cx},${midY} ${rightX},${midY} ${rightX},${visualSize} ${cx},${botY}`}
              fill={faces.right}
              stroke="none"
            />

            {/* Campfire glow — CSS keyframes (campfire-glow), no SMIL. */}
            {glowOpacity > 0 && (
              <circle
                cx={cx}
                cy={visualSize * 0.5}
                r={glowR}
                fill={isWinner ? "#FFB800" : "#FF6B35"}
                opacity={reduce ? glowOpacity * 0.7 : glowOpacity}
                style={
                  reduce
                    ? undefined
                    : {
                        animation: `campfire-glow ${glowDuration}s ease-in-out infinite`,
                        transformOrigin: "center",
                      }
                }
              />
            )}

            {/* Silhouette stroke — Lattice signature: one closed stroke. */}
            <path
              d={`M${cx},${topY} L${rightX},${midY} L${cx},${botY} L${leftX},${midY} Z`}
              fill="none"
              stroke="rgba(231,221,198,0.06)"
              strokeWidth="0.5"
            />
          </svg>
        )}
      </motion.div>
    </>
  );
}
