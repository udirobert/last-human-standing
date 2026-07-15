import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FAQS } from "../lib/copy.js";
import OverlayPortal from "./OverlayPortal.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { CompactButton } from "./ui/CraftCta.jsx";

/**
 * FAQ modal. Default trigger is the floating "?" chip.
 * Pass `trigger` for a custom opener (e.g. “What's public →”)
 * and `expandOnOpen` to land on a specific answer.
 */
export default function FAQModal({
  triggerClassName = "",
  trigger = null,
  expandOnOpen = null,
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const close = useCallback(() => setOpen(false), []);
  const trapRef = useFocusTrap(open, { onEscape: close });

  const openModal = useCallback(() => {
    if (typeof expandOnOpen === "number" && expandOnOpen >= 0) {
      setExpanded(expandOnOpen);
    }
    setOpen(true);
  }, [expandOnOpen]);

  return (
    <>
      {trigger ? (
        <span
          role="button"
          tabIndex={0}
          onClick={openModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal();
            }
          }}
          className="inline-flex cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <CompactButton
          onClick={openModal}
          className={`w-9 h-9 rounded-full bg-smoke/80 backdrop-blur-sm border border-ember/40 text-bone font-mono text-sm flex items-center justify-center hover:border-amber/60 ${triggerClassName}`}
          aria-label="Open FAQ"
        >
          ?
        </CompactButton>
      )}

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
                aria-label="Questions"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", damping: 24 }}
                className="w-full max-w-md bg-smoke border-t sm:border border-amber/30 rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto overscroll-y-contain shadow-2xl outline-none"
                style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-2xl text-bone tracking-wide">
                    QUESTIONS
                  </h3>
                  <CompactButton
                    onClick={close}
                    className="w-8 h-8 rounded-full bg-ash border border-ember/40 text-bone font-mono text-sm hover:border-amber/60"
                    aria-label="Close"
                  >
                    ×
                  </CompactButton>
                </div>
                <div className="space-y-2">
                  {FAQS.map((item, i) => (
                    <div key={item.q} className="bg-ash/60 rounded-xl border border-ember/30 overflow-hidden">
                      <CompactButton
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="w-full px-4 py-3 text-left font-mono text-xs text-bone flex items-center justify-between gap-3"
                      >
                        <span>{item.q}</span>
                        <span className="text-amber text-base shrink-0">
                          {expanded === i ? "−" : "+"}
                        </span>
                      </CompactButton>
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
      </OverlayPortal>
    </>
  );
}
