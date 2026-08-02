import { useState, lazy, Suspense } from "react";
import WorldIdVerify from "../../world/WorldIdVerify.jsx";
import { useTrustTier } from "../../hooks/useTrustTier.js";
import { useWorld } from "../../world/WorldProvider.jsx";
import ScreenLoader from "../ui/ScreenLoader.jsx";

const SelfVerify = lazy(() => import("../SelfVerify.jsx"));

/**
 * Humanity verify — wallet + pay happen first; this lives in the lobby.
 * Browser players see it expanded by default (defaultOpen).
 */
export default function VerifyOptIn({ defaultOpen = false, required = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const { tier } = useTrustTier();
  const { isFarcaster, isWorldApp } = useWorld();

  if (tier === "verified") return null;

  const worldEnabled = import.meta.env.VITE_ENABLE_IDKIT === "true";
  const selfEnabled = import.meta.env.VITE_ENABLE_SELF === "true";
  if (!worldEnabled && !selfEnabled) {
    return required ? (
      <div className="rounded-2xl border border-blood/40 bg-blood/5 p-4 text-blood text-xs font-mono">
        Humanity verification is not configured for this pilot. Please contact the operator.
      </div>
    ) : null;
  }

  const isBrowser = !isWorldApp;
  const headline = isBrowser
    ? `Verify your humanity (${required ? "required" : "recommended"})`
    : "Verify your humanity (optional)";

  return (
    <div className="bg-smoke/70 rounded-2xl border border-neon/30 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 active:scale-[0.99] transition-transform"
      >
        <div className="min-w-0">
          <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-1">
            {headline}
          </p>
          <p className="text-dim text-[11px] font-mono leading-relaxed">
            {isBrowser
              ? required
                ? "Verify before claiming your seat. This pilot admits verified humans only."
                : "Browser accounts stay provisional until verified — required for voting when PoH gate is on."
              : "×2 jury voting power · priority for cohort 2 · ~30 seconds"}
          </p>
        </div>
        <span className="font-mono text-dim text-xs shrink-0 mt-0.5">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-neon/20 pt-3">
          {!isFarcaster && worldEnabled && <WorldIdVerify />}
          {selfEnabled && (
            <Suspense fallback={<ScreenLoader kind="detail" />}>
              <SelfVerify />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
