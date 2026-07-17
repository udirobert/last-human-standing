import { useMemo } from "react";
import { RefreshCcw } from "lucide-react";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import { useTrustTier } from "../hooks/useTrustTier.js";

export default function ModeBanner() {
  const { isWorldApp, isFarcaster, installAttempted, walletAuthed, humanityProvider } = useWorld();
  const { isLoading, usesDemoState, refresh, silentVerification } = useRound();
  const { tier } = useTrustTier();

  const mode = useMemo(() => {
    if (!installAttempted || isLoading) return { label: "Syncing", tone: "dim" };
    // Silent verification: hide PoH provider labels during play — uncertainty is the game.
    if (tier === "verified" && !silentVerification) {
      return {
        label: humanityProvider === "self" ? "Verified · Self" : "Verified · World ID",
        tone: "neon",
      };
    }
    if (isFarcaster) return { label: "Farcaster", tone: "indigo" };
    if (isWorldApp) return { label: "World App", tone: "amber" };
    if (walletAuthed) return { label: "Browser", tone: "indigo" };
    return { label: "Not signed in", tone: "amber" };
  }, [isWorldApp, isFarcaster, installAttempted, isLoading, tier, walletAuthed, humanityProvider, silentVerification]);

  const classes =
    mode.tone === "neon"
      ? "bg-neon/10 border-neon/30 text-neon"
      : mode.tone === "amber"
        ? "bg-amber/10 border-amber/30 text-amber"
        : mode.tone === "indigo"
          ? "bg-indigo/10 border-indigo/30 text-indigo"
          : "bg-smoke border-ember text-dim";

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <div className={`h-7 inline-flex items-center rounded-full border px-2.5 ${classes}`}>
        <span className="font-mono text-[10px] uppercase tracking-wider leading-none">
          {mode.label}
        </span>
      </div>
      {usesDemoState && (
        <button
          type="button"
          onClick={refresh}
          title="Retry live state"
          className="h-7 inline-flex items-center gap-1 rounded-full border border-ember bg-smoke px-2.5 text-dim active:scale-95 transition-transform"
        >
          <RefreshCcw size={11} aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-wider leading-none">
            Retry live state
          </span>
        </button>
      )}
    </div>
  );
}
