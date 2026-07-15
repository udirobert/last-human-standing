import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROUND_UNLOCKS, getRuleMascot } from "../lib/copy.js";
import { TODAY_THEME, findTheme } from "../data/game";
import { useRound } from "../world/RoundProvider.jsx";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import ThemeFairness from "./ThemeFairness.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { HumanCta, GhostLink } from "./ui/CraftCta.jsx";
import { MOTION_DURATION, MOTION_EASE, MOTION_SPRING } from "../lib/motion.js";
import OverlayPortal from "./OverlayPortal.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

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
 * RuleReveal — day unlock overlay. Matches speed-run DayReveal craft:
 * theme motif hero, twist in a secondary card, amber HumanCta.
 */
export default function RuleReveal({ onAudit }) {
  const { phase, currentDay, you, round } = useRound();
  const [unlock, setUnlock] = useState(null);
  const [body, setBody] = useState("");
  const [mascot, setMascot] = useState(null);

  const themeLabel = round?.placeType || round?.name || TODAY_THEME.theme;
  const theme = findTheme(themeLabel) || TODAY_THEME;
  const cap = round?.survivalCap ?? null;

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
    setMascot(getRuleMascot({ day, eliminated }));
  }, [phase, currentDay, you?.isEliminated]);

  const dismiss = useCallback(() => {
    if (!unlock) return;
    markSeen(unlock.id);
    setUnlock(null);
    setMascot(null);
  }, [unlock]);

  const handleCta = useCallback(() => {
    const day = Number(currentDay);
    const goAudit = day === 4 && Boolean(you?.isEliminated) && typeof onAudit === "function";
    dismiss();
    if (goAudit) onAudit();
  }, [currentDay, you?.isEliminated, onAudit, dismiss]);

  const trapRef = useFocusTrap(Boolean(unlock), { onEscape: dismiss });

  return (
    <OverlayPortal>
    <AnimatePresence>
      {unlock && (
        <motion.div
          key={unlock.id}
          ref={trapRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-reveal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6 overflow-y-auto overscroll-y-contain outline-none"
          style={{
            background: "radial-gradient(120% 90% at 50% 0%, rgba(74,50,33,0.97) 0%, rgba(22,16,12,0.98) 55%, rgba(13,13,13,0.99) 100%)",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
            paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={MOTION_SPRING.snappy}
            className="w-full max-w-sm text-center"
          >
            <p className="font-mono text-amber/90 uppercase mb-4" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
              {unlock.eyebrow}
            </p>

            <div className="mb-3 flex justify-center">
              <ThemeMotif emoji={theme.emoji} size={100} label={theme.theme} />
            </div>

            {mascot?.message && (
              <div className="mb-3 flex justify-center">
                <MascotGuide
                  variant={mascot.variant}
                  size={56}
                  message={mascot.message}
                  position="top"
                />
              </div>
            )}

            <h2
              id="rule-reveal-title"
              className="font-display text-bone leading-[0.9] mb-1"
              style={{ fontSize: "clamp(32px,8vw,44px)" }}
            >
              {theme.theme}
            </h2>
            <p className="font-mono text-neon/80 uppercase mb-4" style={{ fontSize: 10, letterSpacing: "0.16em" }}>
              Today&apos;s theme
            </p>

            <div className="w-full rounded-3xl border border-ember/30 bg-smoke/50 backdrop-blur-sm p-4 mb-4 text-left">
              <p className="font-mono text-amber text-[10px] tracking-[0.18em] uppercase mb-1.5">
                The twist
              </p>
              <p className="font-display text-2xl text-bone leading-snug mb-2">
                {unlock.title}
              </p>
              <p className="font-body text-bone/75 text-sm leading-relaxed">{body}</p>
              {cap != null && (
                <p className="mt-3 font-mono text-dim text-[11px] tabular-nums">
                  Survival cap <span className="text-amber">{cap}</span>
                </p>
              )}
            </div>

            <ThemeFairness theme={theme} className="mb-6" />

            <HumanCta onClick={handleCta}>
              {(unlock.cta || "I'm in").replace(/→\s*$/, "").trim()} →
            </HumanCta>
            <GhostLink onClick={dismiss} className="mt-3">
              Dismiss
            </GhostLink>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </OverlayPortal>
  );
}
