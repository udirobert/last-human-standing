import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ThemeMotif from "./ThemeMotif.jsx";

/**
 * ThemeWorld — the "dive into a theme" detail, opened by tapping a card in
 * DailyProofs (docs/ART_DIRECTION.md). The painted motif shared-element-morphs
 * (framer `layoutId`) from its grid slot up into the hero here, so it feels like
 * zooming into that theme's world rather than swapping pages.
 *
 * The hero is deliberately a self-contained slot: today it's the enlarged
 * painted motif on a warm paper stage; in Phase 1 a living gouache clip
 * (Seedance/Kling, seeded from this same motif) drops straight into it behind a
 * poster of the motif — no layout change needed.
 *
 * Motion follows the animations.dev playbook: Apple spring for the morph, a fast
 * backdrop fade, exit snappier than enter, and a plain fade under reduced motion.
 */
export default function ThemeWorld({ theme, layoutId, onClose }) {
  const reduce = useReducedMotion();

  // Escape to close; lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const spring = { type: "spring", duration: 0.5, bounce: 0.15 };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.2, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={theme.theme}
    >
      <div className="absolute inset-0 bg-ash/85 backdrop-blur-sm" />

      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-ember/50 bg-smoke/95 p-6 text-center shadow-2xl"
        initial={{ scale: reduce ? 1 : 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: reduce ? 1 : 0.98, opacity: 0 }}
        transition={{ type: "spring", duration: 0.45, bounce: 0.18 }}
        style={{ transformOrigin: "center" }}
      >
        {/* HERO SLOT — Phase 1 living clip drops in here behind a motif poster. */}
        <div className="relative mx-auto mb-4 flex items-center justify-center" style={{ minHeight: 150 }}>
          <div
            className="absolute inset-x-8 bottom-3 h-16 rounded-full blur-2xl"
            style={{ background: `${theme.color}22` }}
            aria-hidden="true"
          />
          <motion.div layout={!reduce} layoutId={layoutId} transition={spring} className="relative">
            <ThemeMotif emoji={theme.emoji} size={132} label={theme.theme} />
          </motion.div>
        </div>

        <p className="font-mono uppercase text-[11px] tracking-[0.2em]" style={{ color: theme.color }}>
          Today's proof
        </p>
        <h3 className="font-display text-bone text-3xl tracking-wide mt-1">{theme.theme}</h3>
        <p className="font-body text-dim text-sm mt-2 max-w-xs mx-auto leading-snug">{theme.description}</p>

        <p className="font-mono text-dim/70 text-[11px] mt-4">📸 Snap it from anywhere on Earth</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl bg-ash/60 border border-ember text-bone font-body font-medium text-sm active:scale-[0.97] transition-transform"
          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
