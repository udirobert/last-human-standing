import { motion, AnimatePresence } from "framer-motion";
import OverlayPortal from "../OverlayPortal.jsx";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { MOTION_DURATION, MOTION_EASE, MOTION_SPRING } from "../../lib/motion.js";
import { CEREMONY_BG, CEREMONY_PAD, EYEBROW_TONES, TITLE_TONES } from "../../lib/ceremonyTheme.js";

/**
 * CeremonyContent — the shared centered column + spring entrance that every
 * moment uses, live AND demo. This is the part the two systems genuinely
 * share: a max-width, center-aligned column that springs in.
 *
 * It is deliberately NOT a portal and NOT a focus trap — those belong to the
 * room it sits in. Live overlays wrap it in CeremonyShell (portal + trap +
 * warm gradient); the demo wraps it in its own full-screen SpeedRunShell.
 * One content contract, two rooms.
 */
export function CeremonyContent({ children, className = "", maxW = "max-w-sm", align = "center", spring = "snappy" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={spring === "gentle" ? MOTION_SPRING.gentle : MOTION_SPRING.snappy}
      className={`w-full ${maxW} ${align === "center" ? "text-center" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * CeremonyShell — the ONE full-screen moment chrome for LIVE overlays.
 *
 * Owns everything the live overlay components used to re-implement by hand:
 *   - OverlayPortal (escape transform containing blocks, sit above chrome)
 *   - focus trap + Escape-to-dismiss
 *   - AnimatePresence fade
 *   - the warm lit-room radial gradient + safe-area padding
 *   - a centered, scrollable column (via CeremonyContent)
 *
 * RuleReveal, DayRecap, SpecReveal, DayBriefing, and GameMoment become thin
 * content shells rendered inside this one room.
 *
 * Props:
 *   open        — boolean; drives AnimatePresence
 *   onDismiss   — Escape handler (optional)
 *   label       — aria-label for the dialog
 *   z           — z-index tier (default 70 = overlays; wallet uses 80+)
 *   maxW        — tailwind max-width class for the content column
 *   align       — "center" | "top"
 */
export function CeremonyShell({
  open,
  onDismiss,
  label,
  z = 70,
  maxW = "max-w-sm",
  align = "center",
  spring = "snappy",
  overlayKey,
  children,
}) {
  const trapRef = useFocusTrap(Boolean(open), { onEscape: onDismiss });

  return (
    <OverlayPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key={overlayKey}
            ref={trapRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
            className={`fixed inset-0 flex flex-col items-center px-5 overflow-y-auto overscroll-y-contain outline-none ${
              align === "center" ? "justify-center" : "justify-start"
            }`}
            style={{ background: CEREMONY_BG, zIndex: z, ...CEREMONY_PAD }}
          >
            <CeremonyContent maxW={maxW} align={align} spring={spring}>
              {children}
            </CeremonyContent>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}

/** Small mono kicker above a ceremony title. */
export function Eyebrow({ children, tone = "amber", className = "" }) {
  return (
    <p
      className={`font-mono uppercase mb-4 ${EYEBROW_TONES[tone] || EYEBROW_TONES.amber} ${className}`}
      style={{ fontSize: 10, letterSpacing: "0.2em" }}
    >
      {children}
    </p>
  );
}

/** Ceremony headline. */
export function CeremonyTitle({ children, tone = "bone", className = "", size = "clamp(32px,8vw,44px)" }) {
  return (
    <h2
      className={`font-display leading-[0.9] mb-1 ${TITLE_TONES[tone] || TITLE_TONES.bone} ${className}`}
      style={{ fontSize: size }}
    >
      {children}
    </h2>
  );
}

/** Small mono sub-line under the title (e.g. "Today's riddle"). */
export function CeremonySub({ children, tone = "neon", className = "" }) {
  return (
    <p
      className={`font-mono uppercase mb-4 ${EYEBROW_TONES[tone] || EYEBROW_TONES.neon} ${className}`}
      style={{ fontSize: 10, letterSpacing: "0.16em" }}
    >
      {children}
    </p>
  );
}

/** Secondary body text inside a ceremony. */
export function CeremonyBody({ children, className = "" }) {
  return (
    <p className={`font-body text-bone/75 text-sm leading-relaxed ${className}`}>
      {children}
    </p>
  );
}
