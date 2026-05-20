import { useMemo } from "react";
import { useWorld } from "../world/WorldProvider.jsx";
import { useTrustTier } from "../hooks/useTrustTier.js";

export default function ModeBanner() {
  const { isWorldApp, installAttempted } = useWorld();
  const { tier, labels } = useTrustTier();

  const mode = useMemo(() => {
    if (!installAttempted) return { label: "Initializing…", tone: "dim" };
    if (isWorldApp) {
      return {
        label: tier === "verified" ? "World App · verified human" : "World App · verify for full trust",
        tone: tier === "verified" ? "neon" : "amber",
      };
    }
    return {
      label: tier === "verified"
        ? "Browser · verified"
        : "Browser · demo data until live · verify for full trust",
      tone: "amber",
    };
  }, [isWorldApp, installAttempted, tier]);

  const classes =
    mode.tone === "neon"
      ? "bg-neon/10 border-neon/30 text-neon"
      : mode.tone === "amber"
        ? "bg-amber/10 border-amber/30 text-amber"
        : "bg-smoke border-ember text-dim";

  return (
    <div className="fixed top-3 left-3 right-3 z-50 pointer-events-none">
      <div className={`mx-auto max-w-md border rounded-xl px-3 py-2 ${classes}`}>
        <p className="text-xs font-mono text-center tracking-wider uppercase">
          {mode.label}
        </p>
        {tier !== "verified" && installAttempted && (
          <p className="text-[10px] font-mono text-center opacity-80 mt-0.5 normal-case">
            {labels[tier]}
          </p>
        )}
      </div>
    </div>
  );
}
