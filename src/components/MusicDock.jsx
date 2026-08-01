import { motion } from "framer-motion";
import { SoundToggle, useDelight } from "./DelightProvider.jsx";
import { CUE_PRESS } from "../lib/cuelume.js";

/**
 * Always-visible music control — sits above BottomNav so sound is
 * one tap away on every in-game screen (Survive / Vote / Chat / Standings).
 */
export default function MusicDock() {
  const { soundEnabled, stationTitle } = useDelight();

  return (
    <div
      className="fixed z-50 left-1/2 -translate-x-1/2 w-full max-w-[430px] pointer-events-none"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex justify-end px-3 pb-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-2"
        >
          {soundEnabled && stationTitle && (
            <span className="font-mono text-[9px] text-dim/80 tracking-wide max-w-[7rem] truncate">
              {stationTitle}
            </span>
          )}
          <SoundToggle />
        </motion.div>
      </div>
    </div>
  );
}

/** Compact ♪ control used inside headers (GameHome chrome). */
export function HeaderSoundButton({ className = "" }) {
  const { toggleSound, soundEnabled, unlockAndStart, stationTitle } = useDelight();

  return (
    <button
      type="button"
      onClick={() => {
        if (!soundEnabled) {
          toggleSound();
          unlockAndStart?.();
        } else {
          toggleSound();
        }
      }}
      {...CUE_PRESS}
      className={`w-9 h-9 rounded-full bg-smoke/85 backdrop-blur-sm border border-ember/40 text-bone font-mono text-sm flex items-center justify-center hover:border-amber/60 active:scale-[0.97] transition-transform ${className}`}
      title={soundEnabled ? `Mute music${stationTitle ? ` · ${stationTitle}` : ""}` : "Play music"}
      aria-label={soundEnabled ? "Mute music" : "Play music"}
      aria-pressed={soundEnabled}
    >
      <motion.span
        key={soundEnabled ? "on" : "off"}
        initial={{ scale: 1.25, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        aria-hidden
      >
        {soundEnabled ? "♪" : "–"}
      </motion.span>
    </button>
  );
}
