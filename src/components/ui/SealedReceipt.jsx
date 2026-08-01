import { motion } from "framer-motion";
import ThemeMotif from "./ThemeMotif.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../../lib/motion.js";

/**
 * Brief post-submit seal hold — photo + "Sealed for the jury".
 * Presentational only; CheckIn owns timing / reduced-motion.
 */
export default function SealedReceipt({
  photoUrl = null,
  themeEmoji = "☕",
  day = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, rgba(74,50,33,0.97) 0%, rgba(22,16,12,0.98) 55%, rgba(13,13,13,0.99) 100%)",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
      }}
      role="status"
      aria-live="polite"
      aria-label="Sealed for the jury"
    >
      <div className="w-full max-w-sm text-center mb-5">
        <p className="font-mono text-amber text-xs uppercase tracking-[0.2em] mb-2">
          {day != null ? `Day ${day} · Submitted` : "Submitted"}
        </p>
        <p className="font-display text-4xl text-bone leading-none mb-2">Proof received</p>
        <p className="font-body text-bone/60 text-sm">
          Sealed for the jury. Your photo is on trial.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-amber/30 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)] aspect-[4/5] max-h-[42vh] bg-ash relative">
        {photoUrl ? (
          <img src={photoUrl} alt="Your proof" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ThemeMotif emoji={themeEmoji} size={80} label="sealed" />
          </div>
        )}
        <div className="absolute inset-0 bg-ash/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
          <p className="font-mono text-amber text-[10px] uppercase tracking-[0.22em]">
            Sealed receipt
          </p>
          <p className="font-display text-2xl text-bone">Awaiting jury</p>
        </div>
      </div>
    </motion.div>
  );
}
