import { useTrustTier } from "../hooks/useTrustTier.js";
import WorldIdVerify from "../world/WorldIdVerify.jsx";

export default function VoteGateBanner() {
  const { canVote, voteBlockedReason, tier, requireWorldIdForVoting } = useTrustTier();

  if (canVote) return null;

  return (
    <div className="bg-amber/10 border border-amber/40 rounded-2xl p-4 mb-4">
      <p className="text-amber font-mono text-xs uppercase tracking-wider mb-1">Voting locked</p>
      <p className="text-bone text-sm leading-relaxed">{voteBlockedReason}</p>
      {tier === "provisional" && requireWorldIdForVoting && (
        <div className="mt-3">
          <WorldIdVerify />
        </div>
      )}
    </div>
  );
}
