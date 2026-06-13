import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FAQS } from "../lib/copy.js";

/**
 * FAQ modal. Triggered by a floating "?" button in the corner
 * of the welcome screen so the FAQ doesn't take up vertical
 * space on first paint. Pure presentational, no data.
 */
export default function FAQModal({ triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-9 h-9 rounded-full bg-smoke/80 backdrop-blur-sm border border-ember/40 text-bone font-mono text-sm flex items-center justify-center hover:border-amber/60 active:scale-90 transition-all ${triggerClassName}`}
        aria-label="Open FAQ"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ash/90 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 24 }}
              className="w-full max-w-md bg-smoke border-t sm:border border-amber/30 rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-2xl text-bone tracking-wide">
                  QUESTIONS
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-ash border border-ember/40 text-bone font-mono text-sm hover:border-amber/60"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                {FAQS.map((item, i) => (
                  <div key={item.q} className="bg-ash/60 rounded-xl border border-ember/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="w-full px-4 py-3 text-left font-mono text-xs text-bone flex items-center justify-between gap-3"
                    >
                      <span>{item.q}</span>
                      <span className="text-amber text-base shrink-0">
                        {expanded === i ? "−" : "+"}
                      </span>
                    </button>
                    {expanded === i && (
                      <div className="px-4 pb-3 font-mono text-[11px] text-dim leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
