import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import FAQModal from "./FAQModal.jsx";
import { MOTION_SPRING } from "../lib/motion.js";
import { CompactButton } from "./ui/CraftCta.jsx";

/**
 * StageShell — consistent wrapper for every onboarding stage.
 *
 * - Staggered entrance: every direct child <motion.section>
 *   reveals in sequence. Enforces a single visual rhythm.
 * - Consistent max-width + padding + safe-area-insets
 * - Optional back button (top-left) and FAQ button (top-right)
 * - Optional ambient backdrop (phase-aware colors)
 */
export default function StageShell({
  children,
  onBack = null,
  faq = true,
  withAmbient = true,
  AmbientComponent = null,
  className = "",
}) {
  return (
    <motion.div
      className={`relative flex-1 flex flex-col min-h-0 px-6 pt-4 overflow-y-auto overscroll-y-contain ${className}`}
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {withAmbient && AmbientComponent}

      {onBack && (
        <CompactButton
          onClick={onBack}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-smoke/80 backdrop-blur-sm border border-ember/40 text-bone font-mono text-sm flex items-center justify-center hover:border-amber/60"
          aria-label="Back"
        >
          ←
        </CompactButton>
      )}
      {faq && (
        <div className="absolute top-4 right-4 z-10">
          <FAQModal />
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col min-h-0 w-full max-w-md mx-auto">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * StageSection — a single block within a stage. Fades in with a
 * stagger delay based on its index. Use inside <StageShell>.
 */
export function StageSection({ children, index = 0, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { y: 12 }}
      animate={{ y: 0 }}
      transition={reduce ? { duration: 0 } : { ...MOTION_SPRING.snappy, delay: 0.06 + index * 0.06 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/**
 * CohortTicker — a live marquee of recent reservations. Subscribes
 * to /api/cohort/roster and shows the 3 most recent entries.
 * Fades out the bottom edge so the list feels infinite.
 *
 * Pure presentational: pass an array of {address, username} and
 * the rest is styling.
 */
export function CohortTicker({ items = [], pollMs = 15000 }) {
  const [data, setData] = useState(items);
  useEffect(() => setData(items), [items]);

  useEffect(() => {
    if (pollMs <= 0) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/cohort/roster", { credentials: "include" });
        if (!r.ok || cancelled) return;
        const j = await r.json();
        if (cancelled) return;
        setData((j?.roster ?? []).slice(0, 3));
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  if (!data.length) return null;

  return (
    <div className="w-full overflow-hidden relative">
      <p className="font-mono text-amber text-[10px] tracking-widest uppercase text-center mb-1.5">
        just reserved
      </p>
      <div className="space-y-1">
        {data.map((u, i) => (
          <motion.div
            key={u.address}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: "spring", damping: 18 }}
            className="flex items-center gap-2 bg-smoke/40 rounded-full px-3 py-1.5 border border-ember/30"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse shrink-0" />
            <span className="font-mono text-xs text-bone truncate">
              {u.username ? `@${u.username}` : `${u.address?.slice(0, 6)}…${u.address?.slice(-4)}`}
            </span>
            <span className="font-mono text-[10px] text-dim ml-auto shrink-0">just now</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
