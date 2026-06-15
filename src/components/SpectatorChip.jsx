import { useEffect, useState } from "react";

/**
 * SpectatorChip — a small affordance that surfaces when the user
 * is in the live phase but doesn't have a slot in the current
 * cohort. Tells them they can still watch/audit/vote, and offers
 * a "Reserve for cohort 2" CTA so they can opt-in for next round.
 *
 * Variants:
 *   - "spectator": never reserved, can reserve for cohort 2
 *   - "cohort2": entered free lottery, didn't get drawn — priority
 *   - "eliminated": had a slot but got voted out
 */
export default function SpectatorChip({
  user,
  onReserve,
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const isEliminated = user?.eliminated === true;
  const isCohort2Priority = user?.cohort === 2 && !isEliminated;
  const isSpectator = !user?.paid && !isCohort2Priority;

  if (!isSpectator && !isCohort2Priority && !isEliminated) return null;
  // Eliminated has its own UI inside MissionBoard; we only surface
  // the "no slot" variants here.
  if (isEliminated) return null;

  const label = isCohort2Priority
    ? "🎟 Cohort 2 priority"
    : "🔭 Spectator";

  const sub = isCohort2Priority
    ? "You're first in line for cohort 2 when signups open"
    : "Watch the round. Audit, vote, chat — no check-in.";

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full text-left px-3 py-2 rounded-xl border ${
          isCohort2Priority
            ? "bg-amber/5 border-amber/30 hover:border-amber/60"
            : "bg-ash/50 border-ember/40 hover:border-ember/70"
        } transition-colors active:scale-[0.99]`}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-mono text-[11px] tracking-widest ${
              isCohort2Priority ? "text-amber" : "text-dim"
            }`}
          >
            {label}
          </span>
          <span className="text-dim text-[10px] font-mono">
            {expanded ? "−" : "+"}
          </span>
        </div>
        <p className="text-dim text-[10px] font-mono mt-0.5">{sub}</p>
      </button>
      {expanded && isSpectator && onReserve && (
        <button
          type="button"
          onClick={onReserve}
          className="mt-1 w-full py-2 rounded-xl bg-blood/20 border border-blood/40 text-bone font-mono text-xs active:scale-95 transition-transform"
        >
          Reserve a slot for cohort 2 →
        </button>
      )}
    </div>
  );
}
