import { useTrustTier } from "../hooks/useTrustTier.js";
import { useWorld } from "../world/WorldProvider.jsx";

/**
 * Prominent callout when a browser player is provisional — encourages PoH verify.
 */
export default function TrustTierBanner({ onVerify, className = "" }) {
  const { tier, voteBlockedReason, requireWorldIdForVoting } = useTrustTier();
  const { isWorldApp, entryPaid } = useWorld();

  if (!entryPaid || tier === "verified") return null;

  const isBrowser = !isWorldApp;
  const title = isBrowser ? "Browser player — verify to unlock full trust" : "Complete humanity verification";
  const body = isBrowser
    ? "You’re signed in and paid, but without World ID or Self proof your account reads as provisional. Verify (~30s) so the crowd trusts your votes and audit weight."
    : "Verify with World ID or Self to unlock full trust tier and voting credibility.";

  return (
    <div
      className={`rounded-2xl border border-amber/45 bg-amber/10 p-4 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0" aria-hidden>◐</span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-1">
            {title}
          </p>
          <p className="text-bone/80 text-sm font-body leading-relaxed">{body}</p>
          {requireWorldIdForVoting && voteBlockedReason && (
            <p className="text-amber/90 text-[11px] font-mono mt-2 leading-relaxed">
              Voting: {voteBlockedReason}
            </p>
          )}
          {onVerify && (
            <button
              type="button"
              onClick={onVerify}
              className="mt-3 w-full py-2.5 rounded-xl bg-neon/15 border border-neon/40 text-neon font-mono text-xs active:scale-95 transition-transform"
            >
              Verify humanity now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
