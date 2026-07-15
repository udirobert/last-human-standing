import { usePolling } from "../hooks/usePolling.js";
import { getVoteProgressMascot } from "../lib/copy.js";
import MascotGuide from "./ui/MascotGuide.jsx";

/**
 * Live audit engagement — votes cast today vs daily goal, plus
 * how many submissions still need quorum votes.
 */
export default function VoteProgressCard({ onViewFeed, className = "" }) {
  const { data, loading } = usePolling("/api/audit/status", {
    intervalMs: 30_000,
    initial: null,
  });

  if (!data?.day) return null;

  const cast = data.votesCastToday ?? 0;
  const goal = data.dailyGoal ?? 5;
  const pct = goal > 0 ? Math.min(100, Math.round((cast / goal) * 100)) : 0;
  const goalMet = Boolean(data.goalMet);
  const needsVotes = data.needsVotes ?? 0;
  const mascot = getVoteProgressMascot({ goalMet, needsVotes, cast, goal });

  return (
    <div className={`rounded-xl border p-3 mb-3 ${goalMet ? "bg-neon/10 border-neon/30" : "bg-amber/10 border-amber/40"} ${className}`}>
      <div className="flex items-start gap-2 mb-2">
        <MascotGuide
          variant={mascot.variant}
          size={40}
          message={mascot.message}
          position="top"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className={`font-mono text-[10px] tracking-widest uppercase ${goalMet ? "text-neon" : "text-amber"}`}>
            {goalMet ? "Audit duty done" : "Audit the crowd"}
          </p>
          <p className="text-bone font-display text-lg leading-tight mt-0.5 tabular-nums">
            {loading && data.votesCastToday == null
              ? "Loading votes…"
              : `${cast} / ${goal} votes today`}
          </p>
        </div>
        {needsVotes > 0 && (
          <span className="font-mono text-[10px] text-dim bg-ash/60 border border-ember/40 rounded-lg px-2 py-1 shrink-0 tabular-nums">
            {needsVotes} need votes
          </span>
        )}
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-ash border border-ember/40 mb-2">
        <div
          className={`h-full transition-[width] duration-500 ease-out ${goalMet ? "bg-neon" : "bg-amber"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-dim text-[10px] font-mono leading-relaxed mb-2">
        {goalMet
          ? "Verdicts land at day close — keep voting to earn jury tickets."
          : needsVotes > 0
            ? `${needsVotes} photo${needsVotes !== 1 ? "s" : ""} still below the vote quorum. The audit only works if humans vote.`
            : "Open the feed and vote HUMAN or SUS on today's submissions."}
      </p>

      <button
        type="button"
        onClick={onViewFeed}
        className={`w-full py-2.5 rounded-lg font-mono text-xs tracking-wide active:scale-95 transition-transform ${
          goalMet
            ? "bg-ash border border-ember text-bone"
            : "bg-amber/20 border border-amber/50 text-amber"
        }`}
      >
        {goalMet ? "KEEP AUDITING →" : "VOTE IN THE FEED →"}
      </button>
    </div>
  );
}
