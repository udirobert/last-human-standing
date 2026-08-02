import { useState } from "react";
import DozingCat from "./ui/DozingCat.jsx";

/**
 * SpectatorChip — cohort-2 priority only.
 *
 * Plain spectators are handled inside MissionBoard (one place, one CTA).
 * This chip exists for lottery losers who already earned "first in line"
 * status — a status worth showing, not a duplicate "you're watching" note.
 */
export default function SpectatorChip({
  user,
  onReserve,
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const isEliminated = user?.eliminated === true;
  const isCohort2Priority = user?.cohort === 2 && !isEliminated;

  if (!isCohort2Priority) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-3 py-2 rounded-xl border bg-amber/5 border-amber/30 hover:border-amber/60 transition-colors active:scale-[0.99]"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <DozingCat size={46} className="-my-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] tracking-widest text-amber">
                Cohort 2 priority
              </span>
              <span className="text-dim text-[10px] font-mono">
                {expanded ? "−" : "+"}
              </span>
            </div>
            <p className="text-dim text-[10px] font-mono mt-0.5">
              You&apos;re first in line for cohort 2 when signups open
            </p>
          </div>
        </div>
      </button>
      {expanded && onReserve && (
        <button
          type="button"
          onClick={onReserve}
          className="mt-1 w-full py-2 rounded-xl bg-blood/20 border border-blood/40 text-bone font-mono text-xs active:scale-95 transition-transform"
        >
          Claim a seat in the next cohort →
        </button>
      )}
    </div>
  );
}
