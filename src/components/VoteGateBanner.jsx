import { lazy, Suspense } from "react";
import { useTrustTier } from "../hooks/useTrustTier.js";
import { HumanCta } from "./ui/CraftCta.jsx";

// WorldIdVerify pulls in @worldcoin/idkit (~116 kB). It only renders for
// provisional users when the PoH vote gate is on, so lazy-load it.
const WorldIdVerify = lazy(() => import("../world/WorldIdVerify.jsx"));

export default function VoteGateBanner({ onReserve }) {
  const { canVote, voteBlockedReason, tier, requireWorldIdForVoting } = useTrustTier();

  if (canVote) return null;

  const needsReserve = tier === "unverified";

  return (
    <div className="bg-amber/10 border border-amber/40 rounded-2xl p-4 mb-4">
      <p className="text-amber font-mono text-xs uppercase tracking-wider mb-1">Voting locked</p>
      <p className="text-bone text-sm leading-relaxed">{voteBlockedReason}</p>
      {tier === "provisional" && requireWorldIdForVoting && (
        <div className="mt-3">
          <Suspense fallback={null}>
            <WorldIdVerify />
          </Suspense>
        </div>
      )}
      {needsReserve && onReserve && (
        <HumanCta onClick={onReserve} className="mt-3 !py-3 !text-sm">
          Reserve your slot →
        </HumanCta>
      )}
    </div>
  );
}
