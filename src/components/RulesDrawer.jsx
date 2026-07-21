import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RULES, ROUND_UNLOCKS } from "../lib/copy.js";
import OverlayPortal from "./OverlayPortal.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { CompactButton } from "./ui/CraftCta.jsx";

/**
 * Rules-at-a-glance drawer — core loop + per-day unlocks.
 */
export default function RulesDrawer({ triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const trapRef = useFocusTrap(open, { onEscape: close });

  return (
    <>
      <CompactButton
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 rounded-full bg-smoke/80 border border-ember/40 text-dim font-mono text-[10px] hover:text-bone hover:border-amber/40 ${triggerClassName}`}
        aria-label="Open rules at a glance"
      >
        Rules
      </CompactButton>

      <OverlayPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-ash/95 backdrop-blur-md flex items-end sm:items-center justify-center"
              onClick={close}
              role="presentation"
            >
              <motion.div
                ref={trapRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Rules at a glance"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", damping: 24 }}
                className="w-full max-w-md bg-smoke border-t sm:border border-amber/30 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto overscroll-y-contain shadow-2xl outline-none"
                style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-2xl text-bone">Rules at a glance</h2>
                  <CompactButton onClick={close} className="text-dim font-mono text-sm">✕</CompactButton>
                </div>

                <section className="mb-5">
                  <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-3">Core loop</p>
                  <ul className="space-y-3">
                    {RULES.map((rule) => (
                      <li key={rule.n} className="flex gap-3">
                        <span className="text-lg shrink-0" aria-hidden>{rule.icon}</span>
                        <div>
                          <p className="font-display text-sm text-bone">{rule.title}</p>
                          <p className="text-dim text-xs font-body leading-relaxed mt-0.5">{rule.body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-3">Day-by-day twists</p>
                  <ul className="space-y-2">
                    {Object.entries(ROUND_UNLOCKS).map(([day, u]) => (
                      <li key={day} className="bg-ash/50 rounded-xl p-3 border border-ember/25">
                        <p className="font-mono text-dim text-[10px] uppercase mb-0.5">Day {day}</p>
                        <p className="font-display text-sm text-bone">{u.title}</p>
                        <p className="text-dim text-[11px] font-body mt-1 leading-relaxed">{u.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </OverlayPortal>
    </>
  );
}
