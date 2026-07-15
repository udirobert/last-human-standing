import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MascotGuide from "./MascotGuide.jsx";
import { useDelight } from "../DelightProvider.jsx";
import OverlayPortal from "../OverlayPortal.jsx";
import { GameCta, GhostLink, HumanCta } from "./CraftCta.jsx";

/**
 * ExitIntentPrompt — soft exit-intent overlay for the paywall.
 *
 * When a user taps back on the Reserve step, instead of immediately
 * going back, this overlay appears with a softer alternative: try the
 * practice run first. This catches users who aren't ready to pay but
 * might still engage with the game.
 *
 * Props:
 *   open    — whether the overlay is visible
 *   onStay  — callback when user chooses to stay on the paywall
 *   onPractice — callback when user chooses the practice run
 *   onLeave — callback when user confirms they want to leave
 */
export default function ExitIntentPrompt({ open, onStay, onPractice, onLeave }) {
  const { handleMascotClick } = useDelight();
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  return (
    <OverlayPortal>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-ash/90 backdrop-blur-md"
          onClick={onStay}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="relative bg-smoke border border-ember/40 rounded-3xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mascot — understanding, not pushy */}
            <div className="flex justify-center mb-4">
              <MascotGuide
                variant="thinking"
                size={56}
                message="Not ready? That's fair."
                position="top"
                interactive
                onMascotClick={handleMascotClick}
              />
            </div>

            <h3 className="font-display text-2xl text-bone mb-2 leading-tight">
              No pressure.
            </h3>
            <p className="font-body text-bone/70 text-sm leading-relaxed mb-5">
              The pot grows while you decide. Try the practice run first —
              see if the game is yours.
            </p>

            {/* Primary: practice run */}
            <HumanCta onClick={onPractice} className="!py-3.5 mb-2">
              Try the practice run
            </HumanCta>

            {/* Secondary: stay on paywall */}
            <GameCta tone="ghost" onClick={onStay} className="!py-3 !text-sm mb-3">
              Stay on this page
            </GameCta>

            {/* Tertiary: leave — quiet, not prominent */}
            <GhostLink onClick={onLeave} className="tracking-widest uppercase">
              I'll come back later
            </GhostLink>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </OverlayPortal>
  );
}
