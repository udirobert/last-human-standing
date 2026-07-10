import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROUND_UNLOCKS } from "../lib/copy.js";
import { useRound } from "../world/RoundProvider.jsx";

const SEEN_KEY = "lhs_round_unlocks_seen";

function readSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(id) {
  try {
    const next = readSeen();
    next.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * RuleReveal — progressive disclosure for advanced mechanics.
 *
 * Onboarding teaches the core loop only. Each live day unlocks one twist
 * (infiltrator, pressure, wildcard, finale) the first time the player
 * opens home that day. Dismiss once; never nag again.
 *
 * Mythmaking > rulebook: one large-type beat, one body sentence, one CTA.
 */
export default function RuleReveal({ onAudit }) {
  const { phase, currentDay, you } = useRound();
  const [unlock, setUnlock] = useState(null);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (phase !== "live") {
      setUnlock(null);
      return;
    }
    const day = Number(currentDay);
    if (!Number.isFinite(day) || day < 1) {
      setUnlock(null);
      return;
    }
    const entry = ROUND_UNLOCKS[day];
    if (!entry) {
      setUnlock(null);
      return;
    }
    if (readSeen().has(entry.id)) {
      setUnlock(null);
      return;
    }

    const eliminated = Boolean(you?.isEliminated);
    const copy =
      day === 4 && !eliminated && entry.bodyAlive
        ? entry.bodyAlive
        : entry.body;

    setBody(copy);
    setUnlock(entry);
  }, [phase, currentDay, you?.isEliminated]);

  const dismiss = useCallback(() => {
    if (!unlock) return;
    markSeen(unlock.id);
    setUnlock(null);
  }, [unlock]);

  const handleCta = useCallback(() => {
    const day = Number(currentDay);
    const goAudit = day === 4 && Boolean(you?.isEliminated) && typeof onAudit === "function";
    dismiss();
    if (goAudit) onAudit();
  }, [currentDay, you?.isEliminated, onAudit, dismiss]);

  return (
    <AnimatePresence>
      {unlock && (
        <motion.div
          key={unlock.id}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-reveal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ash/95 backdrop-blur-md px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
            className="w-full max-w-sm text-center"
          >
            <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-4">
              {unlock.eyebrow}
            </p>
            <h2
              id="rule-reveal-title"
              className="font-display text-4xl text-bone leading-none tracking-wide mb-4"
            >
              {unlock.title}
            </h2>
            <p className="text-dim font-mono text-sm leading-relaxed mb-8">
              {body}
            </p>
            <button
              type="button"
              onClick={handleCta}
              className="w-full py-4 rounded-2xl bg-blood text-bone font-display text-xl tracking-widest active:scale-[0.97] transition-transform"
            >
              {unlock.cta}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 font-mono text-dim text-xs underline decoration-dotted underline-offset-2"
            >
              Dismiss
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
