import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useCallback, useRef, useId } from 'react';
import GouacheFilters from './ui/GouacheFilters.jsx';
import { GOUACHE as P } from './ui/gouachePalette.js';

/**
 * "Survivor" mascot — a determined little figure that's always one step ahead.
 *
 * Motion design:
 *   - Eye tracking: pupils follow the cursor (the single most-loved
 *     "fun app" interaction. Pure SVG + framer-motion springs, zero
 *     extra bundle weight — chosen over Lottie to keep the bundle
 *     slim.)
 *   - Idle breathing: subtle scale + rotation tilt, 3s loop.
 *   - Pulsing halo: a soft amber glow behind the figure that
 *     breathes with the rest of the animation.
 *   - Variant overrides: each variant (excited, celebrating, etc.)
 *     has its own motion language (bounce, shake, etc.).
 *   - Tap reaction: a confetti burst + secret counter on the 5th tap.
 *
 * The component is intentionally self-contained — drop it in
 * anywhere and the eye tracking + breathing work out of the box.
 */
export default function Mascot({
  variant = "idle",
  size = 96,
  showBadge = false,
  badgeCount = 0,
  name = null,
  onClick = null,
  interactive = false,
  trackCursor = true,
}) {
  const containerRef = useRef(null);
  const [blink, setBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [bursts, setBursts] = useState([]); // Confetti particles
  const burstIdRef = useRef(0);

  // Mouse-driven pupil offset. Smoothed with a spring so the eyes
  // glide rather than snap.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pupilX = useSpring(pointerX, { stiffness: 150, damping: 18, mass: 0.4 });
  const pupilY = useSpring(pointerY, { stiffness: 150, damping: 18, mass: 0.4 });

  useEffect(() => {
    if (!trackCursor) return undefined;
    const onMove = (e) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Clamp to a 60 px radius — keeps the pupils inside the
      // eyes but feels alive. Normalize to [-1, 1].
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const clamp = Math.min(dist, 60) / dist;
      pointerX.set(dx * clamp * 0.025);
      pointerY.set(dy * clamp * 0.025);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [trackCursor, pointerX, pointerY]);

  // Blink animation
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  // Tap interaction
  const handleTap = useCallback(() => {
    if (!interactive) return;
    // Confetti burst
    const id = burstIdRef.current++;
    setBursts((prev) => [...prev, { id, created: Date.now() }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1100);

    setTapCount((prev) => {
      const next = prev + 1;
      if (next === 5) onClick?.("secret");
      else onClick?.("tap");
      return next;
    });
  }, [interactive, onClick]);

  // Body motion per variant. Idle gets the most polish (eye
  // tracking + breathing); the others override with their own
  // animation.
  // Cap variant repeat counts so the mascot eventually settles —
  // an infinite bob is decorative noise on a 30s+ idle state.
  // The `prefers-reduced-motion` media query kills them entirely.
  const reduceMotion = useReducedMotion();
  const variantLoop = reduceMotion ? 0 : 3;

  const motionAnimate =
    variant === "idle"
      ? { y: [0, -3, 0], scale: [1, 1.025, 1], rotate: [0, -1.5, 1.5, 0] }
      : undefined;
  const motionTransition =
    variant === "idle"
      ? { duration: 3.4, repeat: variantLoop, ease: "easeInOut" }
      : undefined;

  const variantAnimate = {
    excited: {
      y: [0, -14, 0, -6, 0],
      scale: [1, 1.1, 1, 1.05, 1],
      rotate: [0, -3, 3, 0],
      transition: { duration: 0.6, repeat: variantLoop },
    },
    celebrating: {
      rotate: [-8, 8, -8, 8, 0],
      scale: [1, 1.18, 1, 1.1, 1],
      transition: { duration: 0.5, repeat: variantLoop },
    },
    thinking: {
      x: [0, -3, 3, -1, 0],
      rotate: [0, -4, 4, 0],
      transition: { duration: 1.5, repeat: variantLoop },
    },
    worried: {
      y: [0, 2, 0],
      scale: [1, 0.96, 1],
      transition: { duration: 0.8, repeat: variantLoop },
    },
    winner: {
      y: [0, -10, 0, -4, 0],
      rotate: [-3, 3, -3, 0],
      scale: [1, 1.06, 1],
      transition: { duration: 1, repeat: variantLoop },
    },
    sad: {
      y: [0, 2, 0],
      scale: [1, 0.95, 1],
      transition: { duration: 2, repeat: variantLoop },
    },
    sleeping: {
      opacity: [1, 0.8, 1],
      transition: { duration: 3, repeat: variantLoop },
    },
    determined: {
      y: [0, -6, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.8, repeat: variantLoop },
    },
    proud: {
      y: [0, -8, 0],
      rotate: [-2, 2, -2, 0],
      transition: { duration: 1.2, repeat: variantLoop },
    },
    shocked: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.3, repeat: variantLoop },
    },
    cheering: {
      y: [0, -16, 0],
      rotate: [-8, 8, -8, 0],
      transition: { duration: 0.5, repeat: variantLoop },
    },
  };

  // Variant-specific expressions
  const customExpression = getExpression(variant);
  const uid = useId().replace(/:/g, "");

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center ${interactive ? "cursor-pointer" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Interact with ${name || "your guide"}` : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTap}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          handleTap();
        }
      }}
    >
      {/* Pulsing halo — gives the mascot a "presence". Pulses twice
          on mount then settles so it doesn't run forever on every
          screen the mascot appears on. Killed entirely under
          prefers-reduced-motion. blur-xl (20px) per the perf
          ceiling in Emil's STANDARDS.md. */}
      {reduceMotion ? null : (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 3, repeat: 2, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 rounded-full bg-amber-500/30 blur-xl"
          style={{ width: size * 1.4, height: size * 1.4, top: -size * 0.2, left: -size * 0.2 }}
        />
      )}

      <motion.div
        initial={{ scale: 0.92, rotate: -8, opacity: 0 }}
        animate={
          variant === "idle" && motionAnimate
            ? motionAnimate
            : variantAnimate[variant] || { scale: 1, opacity: 1 }
        }
        transition={
          motionTransition || { type: "spring", damping: 14, delay: 0.1 }
        }
        className={`relative ${isHovered && interactive ? "scale-110" : ""} transition-transform`}
        style={{ width: size, height: size }}
        whileTap={interactive ? { scale: 0.9 } : {}}
      >
        {/* Glow on hover */}
        {isHovered && interactive && (
          <div className="absolute inset-0 rounded-full bg-amber-500/40 blur-xl animate-pulse" />
        )}

        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <GouacheFilters id={uid} />
            <clipPath id={`${uid}-body`}>
              <ellipse cx="48" cy="56" rx="14" ry="18" />
            </clipPath>
            <clipPath id={`${uid}-head`}>
              <circle cx="48" cy="32" r="16" />
            </clipPath>
          </defs>

          {/* Shadow — gouache grounding */}
          <ellipse cx="48" cy="88" rx="20" ry="6" fill="#000" opacity="0.35" filter={`url(#${uid}-shadow)`} />

          {/* Body group — brush-wobbled */}
          <g transform="translate(48, 48)" filter={`url(#${uid}-brush)`}>
            {/* Legs — warm crema, hand-painted strokes */}
            <path d="M-8 20 Q-14 32 -12 38" stroke={P.crema} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M8 20 Q14 28 10 36" stroke={P.crema} strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Body — terracotta like the cat, not flat red */}
            <ellipse cx="0" cy="8" rx="14" ry="18" fill={P.terracotta} />
            {/* Body shade — right side shadow */}
            <path
              d="M0,-10 C8,-10 14,-4 14,8 C14,18 8,26 0,26 C6,20 10,12 10,2 C10,-6 6,-10 0,-10 Z"
              fill={P.terracottaShade}
              opacity="0.4"
            />

            {/* Arms — warm crema strokes */}
            <path d="M-14 0 Q-28 -8 -24 -16" stroke={P.crema} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M14 0 Q24 -12 20 -22" stroke={P.crema} strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Head — amber/petal, warm and human */}
            <circle cx="0" cy="-16" r="16" fill={P.petal} />
            {/* Head shade */}
            <path
              d="M0,-32 C8,-32 16,-24 16,-16 C16,-8 8,0 0,0 C6,-4 10,-10 10,-18 C10,-26 6,-30 0,-32 Z"
              fill={P.petalShade}
              opacity="0.35"
            />

            {/* Paper grain on body */}
            <g clipPath={`url(#${uid}-body)`}>
              <rect x="-14" y="-10" width="28" height="36" filter={`url(#${uid}-grain)`} opacity="0.5" />
            </g>
            {/* Paper grain on head */}
            <g clipPath={`url(#${uid}-head)`} transform="translate(-48, -48)">
              <rect x="32" y="16" width="32" height="32" filter={`url(#${uid}-grain)`} opacity="0.4" />
            </g>

            {/* EYES — animated pupils that track the cursor */}
            {customExpression
              ? customExpression
              : !blink
                ? (
                    <>
                      {/* Eye whites — cream, not pure white */}
                      <circle cx="-6" cy="-18" r="5" fill={P.foam} />
                      <circle cx="6" cy="-18" r="5" fill={P.foam} />
                      {/* Pupils — warm dark espresso, not pure black */}
                      <motion.circle
                        cx={-6}
                        cy={-18}
                        r={3}
                        fill={P.espresso}
                        style={{ x: pupilX, y: pupilY }}
                      />
                      <motion.circle
                        cx={6}
                        cy={-18}
                        r={3}
                        fill={P.espresso}
                        style={{ x: pupilX, y: pupilY }}
                      />
                      {/* Eye shine — follows pupils */}
                      <motion.circle
                        cx={-5}
                        cy={-19}
                        r={1.2}
                        fill={P.foam}
                        style={{ x: pupilX, y: pupilY }}
                      />
                      <motion.circle
                        cx={7}
                        cy={-19}
                        r={1.2}
                        fill={P.foam}
                        style={{ x: pupilX, y: pupilY }}
                      />
                    </>
                  )
                : (
                    <path d="M-10 -18 Q-6 -14 -2 -18 M2 -18 Q6 -14 10 -18" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
                  )}

            {/* Smile (only if no custom expression provides one) */}
            {!customExpression && (
              <path d="M-6 -8 Q0 -4 6 -8" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            )}

            {/* Headband — blood red, the game's signature accent */}
            <path d="M-16 -16 Q0 -22 16 -16" stroke="#FF1A1A" strokeWidth="4" strokeLinecap="round" fill="none" />

            {/* Sweat drop — muted gouache teal */}
            <path d="M20 -10 Q22 -6 22 -2 Q22 2 20 2 Q18 2 18 -2 Q18 -6 20 -10" fill={P.water} opacity="0.8" />
          </g>

          {/* Speed lines — subtle, warm */}
          <g opacity="0.4" filter={`url(#${uid}-brush)`}>
            <line x1="4" y1="40" x2="12" y2="40" stroke={P.leaf} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="48" x2="10" y2="48" stroke={P.leaf} strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="56" x2="14" y2="56" stroke={P.leaf} strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>

        {/* Confetti burst on tap */}
        {bursts.map((b) => (
          <Burst key={b.id} />
        ))}

        {/* Badge */}
        {showBadge && badgeCount > 0 && (
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-blood rounded-full flex items-center justify-center border-2 border-amber">
            <span className="text-bone text-[10px] font-mono font-bold">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          </div>
        )}
      </motion.div>

      {/* Existing celebrating confetti (kept) */}
      {variant === "celebrating" && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`old-${i}`}
              initial={{ opacity: 1, scale: 0 }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, 1],
                y: [0, -30],
                x: [0, (i - 2.5) * 15],
              }}
              transition={{ duration: 1, repeat: variantLoop, delay: i * 0.1 }}
              className="absolute"
              style={{ top: "50%", left: "50%" }}
            >
              <span className="text-lg">{["✨", "⭐", "💫", "🔥", "⚡", "🌟"][i]}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Name label */}
      {name && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-1 bg-smoke/80 rounded-full border border-ember/40"
        >
          <span className="text-amber text-xs font-mono">{name}</span>
        </motion.div>
      )}

      {/* Speech bubble */}
      {interactive && isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-smoke border border-ember/50 rounded-xl px-3 py-1.5 shadow-lg z-20"
        >
          <span className="text-bone/80 text-xs whitespace-nowrap font-body">
            {tapCount > 0 ? `${5 - tapCount} more...` : "Tap me!"}
          </span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-smoke" />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Confetti burst — a fan of colored squares that fly out from
 * the mascot on tap. Auto-cleans after 1.1s.
 */
function Burst() {
  const COLORS = ["#FFB800", "#FF1A1A", "#00FF94", "#00C8FF", "#FFFFFF"];
  const ICONS = ["✨", "⭐", "💫", "🔥", "⚡", "🌟"];
  // Deterministic spread — visual variety without Math.random()
  // (eslint's react-hooks/purity rule + render purity).
  const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * Math.PI * 2,
    distance: 40 + (i * 7) % 20,
    rotation: ((i * 47) % 360) - 180,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance - 10,
            opacity: 0,
            scale: 1,
            rotate: p.rotation,
          }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          className="absolute top-1/2 left-1/2 text-base"
          style={{ color: COLORS[i % COLORS.length] }}
        >
          {ICONS[i % ICONS.length]}
        </motion.span>
      ))}
    </div>
  );
}

function getExpression(variant) {
  switch (variant) {
    case "excited":
      return (
        <>
          <path d="M-11 -18 Q-6 -24 -1 -18" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M1 -18 Q6 -24 11 -18" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M-7 -8 Q0 0 7 -8" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill={P.foam} />
        </>
      );
    case "celebrating":
    case "cheering":
      return (
        <>
          <path d="M-11 -19 Q-6 -13 -1 -19" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M1 -19 Q6 -13 11 -19" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M-8 -9 Q0 2 8 -9 Q0 -3 -8 -9" fill={P.espresso} />
        </>
      );
    case "thinking":
      return (
        <>
          <circle cx="-6" cy="-18" r="4" fill={P.foam} />
          <circle cx="6" cy="-18" r="4" fill={P.foam} />
          <circle cx="-4.5" cy="-19.5" r="2.5" fill={P.espresso} />
          <circle cx="7.5" cy="-19.5" r="2.5" fill={P.espresso} />
          <path d="M-4 -7 Q1 -9 6 -7" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "worried":
      return (
        <>
          <path d="M-10 -22 L-2 -20" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" />
          <path d="M10 -22 L2 -20" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" />
          <circle cx="-6" cy="-17" r="3" fill={P.espresso} />
          <circle cx="6" cy="-17" r="3" fill={P.espresso} />
          <path d="M-6 -5 Q0 -10 6 -5" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
    case "winner":
      return (
        <>
          <path d="M-11 -19 Q-6 -24 -1 -19" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M1 -19 Q6 -24 11 -19" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M-8 -8 Q0 -1 8 -8" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      );
    case "sad":
      return (
        <>
          <path d="M-10 -20 Q-6 -16 -2 -20" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M2 -20 Q6 -16 10 -20" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M-6 -6 Q0 -10 6 -6" stroke={P.espresso} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
    case "sleeping":
      return (
        <>
          <path d="M-10 -18 L-2 -18" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M2 -18 L10 -18" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M-4 -8 Q0 -6 4 -8" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "shocked":
      return (
        <>
          <circle cx="-6" cy="-18" r="5" fill={P.espresso} />
          <circle cx="6" cy="-18" r="5" fill={P.espresso} />
          <circle cx="-5" cy="-19" r="2" fill={P.foam} />
          <circle cx="7" cy="-19" r="2" fill={P.foam} />
          <circle cx="0" cy="-6" r="4" fill={P.espresso} />
        </>
      );
    case "determined":
      return (
        <>
          <path d="M-10 -20 L-2 -18" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M10 -20 L2 -18" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="-6" cy="-18" r="3" fill={P.espresso} />
          <circle cx="6" cy="-18" r="3" fill={P.espresso} />
          <path d="M-8 -6 Q0 -2 8 -6" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      );
    case "proud":
      return (
        <>
          <path d="M-10 -18 Q-6 -14 -2 -18" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M2 -18 Q6 -14 10 -18" stroke={P.espresso} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M-8 -6 Q0 -2 8 -6" stroke={P.espresso} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      );
    default:
      return null;
  }
}

/**
 * Small mascot avatar for use in lists and headers.
 *
 * status: alive | eliminated | pending
 * badgeCount: optional numeric badge
 */
export function MascotAvatar({ size = 32, status = "alive", badgeCount = 0 }) {
  const statusColors = {
    alive: { bg: "bg-neon/20", border: "border-neon", icon: "✓" },
    eliminated: { bg: "bg-blood/20", border: "border-blood", icon: "💀" },
    pending: { bg: "bg-amber/20", border: "border-amber", icon: "?" },
  };
  const colors = statusColors[status] || statusColors.pending;

  return (
    <div className="relative inline-flex">
      <div
        className={`rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        <span className="text-sm">{colors.icon}</span>
      </div>
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber text-[#1a1206] rounded-full text-[10px] font-mono font-bold flex items-center justify-center border border-amber">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}
