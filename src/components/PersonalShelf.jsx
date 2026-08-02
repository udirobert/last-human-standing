import { useRound } from "../world/RoundProvider.jsx";
import { readCheckinPreview } from "../lib/checkinPreview.js";
import { getDetectiveTitle } from "../lib/detective.js";
import StreakBloom from "./ui/StreakBloom.jsx";

/**
 * Warm personal artifact strip — proof thumb, streak, tickets, detective rank.
 * Cold census (survivors / cohort) stays elsewhere; this is "your life in the room."
 */
export default function PersonalShelf({ className = "", onViewHistory }) {
  const { you, currentDay, phase } = useRound();

  if (!you?.isAuthed || phase === "prelaunch") return null;

  const streak = you.checkinStreak ?? 0;
  const tickets = you.juryTickets ?? 0;
  const resolved = you.votesResolved ?? 0;
  const accuracy = you.voteAccuracy;
  const title = getDetectiveTitle(resolved, accuracy);
  const proofThumb = readCheckinPreview({ day: currentDay });
  const hasArtifacts =
    Boolean(proofThumb) ||
    streak > 0 ||
    tickets > 0 ||
    resolved > 0 ||
    Boolean(you.checkedInToday);

  if (!hasArtifacts) return null;

  const accLabel =
    resolved > 0 && accuracy != null ? `${Math.round(accuracy * 100)}%` : null;

  return (
    <div
      className={`rounded-2xl border border-ember/30 bg-ash/50 px-3 py-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-mono text-xs text-amber uppercase tracking-[0.18em]">
          Your shelf
        </p>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="font-mono text-[11px] text-dim hover:text-bone underline decoration-dotted underline-offset-2"
          >
            History
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {proofThumb ? (
          <div className="w-12 h-[3.75rem] rounded-xl overflow-hidden border border-amber/35 bg-ash shrink-0">
            <img src={proofThumb} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-[3.75rem] rounded-xl border border-ember/30 bg-smoke/60 shrink-0 flex items-center justify-center">
            <StreakBloom streak={streak} size={32} />
          </div>
        )}

        <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {streak > 0 && <StreakBloom streak={streak} size={22} className="shrink-0" />}
              <p className="font-display text-xl text-bone leading-none tabular-nums">
                {streak}
              </p>
            </div>
            <p className="text-bone/60 text-[10px] font-mono uppercase mt-1">Streak</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl text-amber leading-none tabular-nums">
              {tickets}
            </p>
            <p className="text-bone/60 text-[10px] font-mono uppercase mt-1">Tickets</p>
          </div>
          <div className="text-center min-w-0">
            <p className="font-display text-sm text-bone leading-tight truncate" title={title}>
              {title}
            </p>
            <p className="text-bone/60 text-[10px] font-mono uppercase mt-1 tabular-nums">
              {accLabel ?? (resolved > 0 ? `${resolved} votes` : "Detective")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
