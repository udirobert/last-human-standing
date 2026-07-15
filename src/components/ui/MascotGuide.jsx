import { motion, AnimatePresence } from "framer-motion";
import Mascot from "../Mascot.jsx";
import { MOTION_SPRING } from "../../lib/motion.js";

/**
 * MascotGuide — Survivor as a guide, not decoration.
 *
 * Wraps the Mascot with a speech bubble system so it can
 * deliver dialogue at key moments. The mascot reacts with
 * context-appropriate expressions and a short line of copy.
 *
 * Used across the speedrun, onboarding, and game moments
 * to create a through-line personality.
 *
 * Props:
 *   variant   — Mascot expression (idle, excited, celebrating, sad, etc.)
 *   size      — mascot size in px (default 64)
 *   message   — string | null — speech bubble text. null = no bubble.
 *   position  — 'top' | 'bottom' — bubble position relative to mascot
 *   className — extra classes for the wrapper
 *   interactive — whether the mascot is tappable
 *   onMascotClick — callback for mascot taps
 *   showBadge — show a badge dot/count
 *   badgeCount — number to display on the badge
 *   trackCursor — whether pupils follow the cursor (default true)
 */
export default function MascotGuide({
  variant = "idle",
  size = 64,
  message = null,
  position = "top",
  className = "",
  interactive = false,
  onMascotClick,
  showBadge = false,
  badgeCount = 0,
  trackCursor = true,
  name = null,
}) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {message && position === "top" && (
        <SpeechBubble position="top">{message}</SpeechBubble>
      )}
      <Mascot
        variant={variant}
        size={size}
        interactive={interactive}
        onClick={onMascotClick}
        showBadge={showBadge}
        badgeCount={badgeCount}
        trackCursor={trackCursor}
        name={name}
      />
      {message && position === "bottom" && (
        <SpeechBubble position="bottom">{message}</SpeechBubble>
      )}
    </div>
  );
}

function SpeechBubble({ children, position = "top" }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === "top" ? 8 : -8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={MOTION_SPRING.snappy}
        className={`relative max-w-[220px] px-4 py-2.5 rounded-2xl bg-smoke border border-amber/40 ${position === "top" ? "mb-3" : "mt-3"}`}
      >
        <p className="text-bone font-body text-xs leading-relaxed text-center">
          {children}
        </p>
        {/* Tail */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] ${
            position === "top"
              ? "-bottom-1.5 border-t-[8px] border-l-transparent border-r-transparent border-t-smoke"
              : "-top-1.5 border-b-[8px] border-l-transparent border-r-transparent border-b-smoke"
          }`}
        />
      </motion.div>
    </AnimatePresence>
  );
}
