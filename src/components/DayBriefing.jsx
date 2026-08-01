import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { ROUND_UNLOCKS } from "../lib/copy.js";
import OverlayPortal from "./OverlayPortal.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { GameCta } from "./ui/CraftCta.jsx";
import {
  briefingStorageKey,
  markBriefingSeen,
} from "../lib/ceremonyGate.js";

/**
 * Fallback day briefing when RuleReveal has no unlock entry.
 * Days 1–5 use RuleReveal as the single ceremony — this stays for
 * edge cases / future days without a ROUND_UNLOCKS card.
 */
export default function DayBriefing({ onDismiss }) {
  const { isLive, currentDay, round } = useRound();
  const [open, setOpen] = useState(false);
  const unlock = currentDay != null ? ROUND_UNLOCKS[currentDay] : null;
  const cap = round?.survivalCap ?? null;

  useEffect(() => {
    if (!isLive || !currentDay || !unlock) {
      setOpen(false);
      return;
    }
    // RuleReveal owns days with a ROUND_UNLOCKS card — never stack under it.
    if (ROUND_UNLOCKS[currentDay]) {
      markBriefingSeen(currentDay);
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(briefingStorageKey(currentDay)) === "1") return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [isLive, currentDay, unlock]);

  const dismiss = useCallback(() => {
    markBriefingSeen(currentDay);
    setOpen(false);
    onDismiss?.();
  }, [currentDay, onDismiss]);

  const trapRef = useFocusTrap(open, { onEscape: dismiss });

  if (!unlock) return null;

  return (
    <OverlayPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] bg-ash/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={dismiss}
            role="presentation"
          >
            <motion.div
              ref={trapRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`Day ${currentDay} briefing`}
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", damping: 26 }}
              className="w-full max-w-md bg-smoke border border-neon/35 rounded-3xl p-6 outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-2">
                {unlock.eyebrow}
              </p>
              <p className="font-display text-3xl text-bone leading-tight mb-2">{unlock.title}</p>
              <p className="text-bone/75 text-sm font-body leading-relaxed mb-4">{unlock.body}</p>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="bg-ash/60 rounded-xl p-3 border border-ember/30">
                  <p className="text-dim text-[9px] font-mono uppercase">Survival cap</p>
                  <p className="font-display text-2xl text-bone tabular-nums">{cap ?? "—"}</p>
                </div>
                <div className="bg-ash/60 rounded-xl p-3 border border-ember/30 min-h-[4.5rem]">
                  <p className="text-dim text-[9px] font-mono uppercase">Consequence</p>
                  <p className="text-bone text-xs font-mono mt-1 leading-snug">
                    Miss check-in or get flagged = out. Jury keeps playing.
                  </p>
                </div>
              </div>

              <GameCta tone="neon" onClick={dismiss}>
                {currentDay != null ? `Continue to Day ${currentDay} →` : unlock.cta}
              </GameCta>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}
