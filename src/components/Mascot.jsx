import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';

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
  const motionAnimate =
    variant === "idle"
      ? { y: [0, -3, 0], scale: [1, 1.025, 1], rotate: [0, -1.5, 1.5, 0] }
      : undefined;
  const motionTransition =
    variant === "idle"
      ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
      : undefined;

  const variantAnimate = {
    excited: {
      y: [0, -14, 0, -6, 0],
      scale: [1, 1.1, 1, 1.05, 1],
      rotate: [0, -3, 3, 0],
      transition: { duration: 0.6, repeat: Infinity },
    },
    celebrating: {
      rotate: [-8, 8, -8, 8, 0],
      scale: [1, 1.18, 1, 1.1, 1],
      transition: { duration: 0.5, repeat: Infinity },
    },
    thinking: {
      x: [0, -3, 3, -1, 0],
      rotate: [0, -4, 4, 0],
      transition: { duration: 1.5, repeat: Infinity },
    },
    worried: {
      y: [0, 2, 0],
      scale: [1, 0.96, 1],
      transition: { duration: 0.8, repeat: Infinity },
    },
    winner: {
      y: [0, -10, 0, -4, 0],
      rotate: [-3, 3, -3, 0],
      scale: [1, 1.06, 1],
      transition: { duration: 1, repeat: Infinity },
    },
    sad: {
      y: [0, 2, 0],
      scale: [1, 0.95, 1],
      transition: { duration: 2, repeat: Infinity },
    },
    sleeping: {
      opacity: [1, 0.8, 1],
      transition: { duration: 3, repeat: Infinity },
    },
    determined: {
      y: [0, -6, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.8, repeat: Infinity },
    },
    proud: {
      y: [0, -8, 0],
      rotate: [-2, 2, -2, 0],
      transition: { duration: 1.2, repeat: Infinity },
    },
    shocked: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.3, repeat: Infinity },
    },
    cheering: {
      y: [0, -16, 0],
      rotate: [-8, 8, -8, 0],
      transition: { duration: 0.5, repeat: Infinity },
    },
  };

  // Variant-specific expressions
  const customExpression = getExpression(variant);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center ${interactive ? "cursor-pointer" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTap}
    >
      {/* Pulsing halo — gives the mascot a "presence" */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-amber-500/30 blur-2xl"
        style={{ width: size * 1.4, height: size * 1.4, top: -size * 0.2, left: -size * 0.2 }}
      />

      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
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
            <radialGradient id="mascot-body" cx="0.5" cy="0.4">
              <stop offset="0%" stopColor="#FF4444" />
              <stop offset="100%" stopColor="#CC0000" />
            </radialGradient>
          </defs>

          {/* Shadow */}
          <ellipse cx="48" cy="88" rx="20" ry="6" fill="rgba(0,0,0,0.3)" />

          {/* Body group */}
          <g transform="translate(48, 48)">
            {/* Legs - mid-stride */}
            <path d="M-8 20 Q-14 32 -12 38" stroke="#FFB800" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M8 20 Q14 28 10 36" stroke="#FFB800" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Body */}
            <ellipse cx="0" cy="8" rx="14" ry="18" fill="url(#mascot-body)" />

            {/* Arms */}
            <path d="M-14 0 Q-28 -8 -24 -16" stroke="#FFB800" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M14 0 Q24 -12 20 -22" stroke="#FFB800" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Head */}
            <circle cx="0" cy="-16" r="16" fill="#FFB800" />

            {/* EYES — animated pupils that track the cursor */}
            {customExpression
              ? customExpression
              : !blink
                ? (
                    <>
                      {/* Eye whites */}
                      <circle cx="-6" cy="-18" r="5" fill="#FFFFFF" />
                      <circle cx="6" cy="-18" r="5" fill="#FFFFFF" />
                      {/* Pupils — move with cursor */}
                      <motion.circle
                        cx={-6}
                        cy={-18}
                        r={3}
                        fill="#0D0D0D"
                        style={{ x: pupilX, y: pupilY }}
                      />
                      <motion.circle
                        cx={6}
                        cy={-18}
                        r={3}
                        fill="#0D0D0D"
                        style={{ x: pupilX, y: pupilY }}
                      />
                      {/* Eye shine — follows pupils */}
                      <motion.circle
                        cx={-5}
                        cy={-19}
                        r={1.2}
                        fill="#FFFFFF"
                        style={{ x: pupilX, y: pupilY }}
                      />
                      <motion.circle
                        cx={7}
                        cy={-19}
                        r={1.2}
                        fill="#FFFFFF"
                        style={{ x: pupilX, y: pupilY }}
                      />
                    </>
                  )
                : (
                    <path d="M-10 -18 Q-6 -14 -2 -18 M2 -18 Q6 -14 10 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
                  )}

            {/* Smile (only if no custom expression provides one) */}
            {!["sad", "sleeping", "shocked", "determined", "proud"].includes(variant) && (
              <path d="M-6 -8 Q0 -4 6 -8" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            )}

            {/* Headband */}
            <path d="M-16 -16 Q0 -22 16 -16" stroke="#FF1A1A" strokeWidth="4" strokeLinecap="round" fill="none" />

            {/* Sweat drop */}
            <path d="M20 -10 Q22 -6 22 -2 Q22 2 20 2 Q18 2 18 -2 Q18 -6 20 -10" fill="#00C8FF" opacity="0.8" />
          </g>

          {/* Speed lines */}
          <g opacity="0.6">
            <line x1="4" y1="40" x2="12" y2="40" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="48" x2="10" y2="48" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="56" x2="14" y2="56" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" />
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
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
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
          className="mt-2 px-3 py-1 bg-gray-800/80 rounded-full border border-gray-700"
        >
          <span className="text-amber-400 text-xs font-medium">{name}</span>
        </motion.div>
      )}

      {/* Speech bubble */}
      {interactive && isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl px-3 py-1.5 shadow-lg z-20"
        >
          <span className="text-gray-300 text-xs whitespace-nowrap">
            {tapCount > 0 ? `${5 - tapCount} more...` : "Tap me!"}
          </span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-800" />
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
          transition={{ duration: 0.9, ease: "easeOut" }}
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
    case "sad":
      return (
        <>
          <path d="M-10 -20 Q-6 -16 -2 -20" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M2 -20 Q6 -16 10 -20" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M-6 -6 Q0 -10 6 -6" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
    case "sleeping":
      return (
        <>
          <path d="M-10 -18 L-2 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M2 -18 L10 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M-4 -8 Q0 -6 4 -8" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "shocked":
      return (
        <>
          <circle cx="-6" cy="-18" r="5" fill="#0D0D0D" />
          <circle cx="6" cy="-18" r="5" fill="#0D0D0D" />
          <circle cx="-5" cy="-19" r="2" fill="white" />
          <circle cx="7" cy="-19" r="2" fill="white" />
          <circle cx="0" cy="-6" r="4" fill="#0D0D0D" />
        </>
      );
    case "determined":
      return (
        <>
          <path d="M-10 -20 L-2 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M10 -20 L2 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="-6" cy="-18" r="3" fill="#0D0D0D" />
          <circle cx="6" cy="-18" r="3" fill="#0D0D0D" />
          <path d="M-8 -6 Q0 -2 8 -6" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      );
    case "proud":
      return (
        <>
          <path d="M-10 -18 Q-6 -14 -2 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M2 -18 Q6 -14 10 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M-8 -6 Q0 -2 8 -6" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      );
    default:
      return null;
  }
}

/**
 * Small mascot avatar for use in lists and headers
 */
export function MascotAvatar({ size = 32, status = "alive" }) {
  const statusColors = {
    alive: { bg: "bg-neon/20", border: "border-neon", icon: "✓" },
    eliminated: { bg: "bg-blood/20", border: "border-blood", icon: "💀" },
    pending: { bg: "bg-amber/20", border: "border-amber", icon: "?" },
  };
  const colors = statusColors[status] || statusColors.pending;

  return (
    <div
      className={`rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
      style={{ width: size, height: size }}
    >
      <span className="text-sm">{colors.icon}</span>
    </div>
  );
}
