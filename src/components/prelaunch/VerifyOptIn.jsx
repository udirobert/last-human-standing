import { useState, lazy, Suspense } from "react";
import WorldIdVerify from "../../world/WorldIdVerify.jsx";
import { useTrustTier } from "../../hooks/useTrustTier.js";
import { useWorld } from "../../world/WorldProvider.jsx";
import ScreenLoader from "../ui/ScreenLoader.jsx";

const SelfVerify = lazy(() => import("../SelfVerify.jsx"));

/**
 * Collapsed-by-default humanity verify — wallet + pay happen first;
 * this lives in the lobby for optional power-up.
 */
export default function VerifyOptIn() {
  const [open, setOpen] = useState(false);
  const { tier } = useTrustTier();
  const { isFarcaster } = useWorld();

  if (tier === "verified") return null;

  const worldEnabled = import.meta.env.VITE_ENABLE_IDKIT === "true";
  const selfEnabled = import.meta.env.VITE_ENABLE_SELF === "true";
  if (!worldEnabled && !selfEnabled) return null;

  return (
    <div className="bg-smoke/70 rounded-2xl border border-neon/30 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 active:scale-[0.99] transition-transform"
      >
        <div className="min-w-0">
          <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-1">
            Verify your humanity (optional)
          </p>
          <p className="text-dim text-[11px] font-mono leading-relaxed">
            ×2 jury voting power · priority for cohort 2 · ~30 seconds
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
