import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ThemeMotif from "./ThemeMotif.jsx";

/**
 * Living gouache clips per theme (Phase 1, baked + committed under /public).
 * Seeded from each theme's painted motif so the video inherits the hand.
 * Poster-first + lazy; a theme with no entry just uses the painted motif.
 */
const THEME_ASSETS = {
  1: { video: "/motifs/cafe/cafe.mp4", poster: "/motifs/cafe/cafe-poster.jpg" }, // AT A CAFÉ
};

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
  const asset = THEME_ASSETS[theme.id];
  const saveData = typeof navigator !== "undefined" && navigator.connection?.saveData;
  const showVideo = Boolean(asset) && !reduce && !saveData;
  // After the shared-element morph settles, dissolve the flat motif to reveal
  // the living scene beneath — the "bloom" from icon to world.
  const [bloom, setBloom] = useState(false);
  useEffect(() => {
    if (!asset) return undefined;
    const t = setTimeout(() => setBloom(true), reduce ? 200 : 520);
    return () => clearTimeout(t);
  }, [asset, reduce]);

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
        {/* HERO — living gouache scene (poster-first) that the flat motif blooms into. */}
        {asset ? (
          <div className="relative mx-auto mb-4 w-full aspect-square max-h-[340px] rounded-2xl overflow-hidden border border-ember/40">
            <img src={asset.poster} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
            {showVideo && (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={asset.video}
                poster={asset.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                layout={!reduce}
                layoutId={layoutId}
                animate={{ opacity: bloom ? 0 : 1 }}
                transition={{ layout: spring, opacity: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }}
                className="relative"
              >
                <ThemeMotif emoji={theme.emoji} size={132} label={theme.theme} />
              </motion.div>
            </div>
          </div>
        ) : (
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
        )}

        <p className="font-mono uppercase text-[11px] tracking-[0.2em]" style={{ color: theme.color }}>
          A place it might accept
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
