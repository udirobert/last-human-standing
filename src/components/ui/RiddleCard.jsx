import { useRound } from "../../world/RoundProvider.jsx";

/**
 * RiddleCard — shows the daily riddle + commit-reveal transparency.
 *
 * Before the spec is revealed (T+18h): shows the riddle text + the committed
 * spec hash (so players can verify the criteria were fixed before any
 * submission). After reveal: shows the full resolution spec.
 *
 * Part of Riddle Rounds (docs/RIDDLE_ROUNDS.md §2.1-2.3).
 */
export default function RiddleCard({ className = "" }) {
  const { round } = useRound();
  if (!round?.riddle) return null;

  return (
    <div className={`rounded-2xl border border-bone/10 bg-bone/5 p-4 ${className}`}>
      {/* The riddle — the interpretive prompt replacing literal place types */}
      <div className="flex items-start gap-2">
        <span className="text-amber text-lg leading-none mt-0.5" aria-hidden="true">🧩</span>
        <div className="flex-1">
          <p className="text-bone text-sm font-medium leading-relaxed">{round.riddle}</p>
        </div>
      </div>

      {/* Commit-reveal transparency: the spec hash is committed before any
          submission. Players can verify the criteria were fixed. */}
      {round.specHash && (
        <div className="mt-3 pt-3 border-t border-bone/5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] tracking-widest text-dim/50 uppercase">
              {round.specRevealed ? "Spec Revealed" : "Spec Committed"}
            </span>
            <span className="text-dim/30 text-[10px] font-mono">
              {round.specHash.slice(0, 10)}…{round.specHash.slice(-6)}
            </span>
          </div>

          {/* After reveal (T+18h): show the actual resolution criteria */}
          {round.specRevealed && round.spec && (
            <div className="mt-2 space-y-1.5">
              {round.spec.literal_categories && (
                <div>
                  <span className="font-mono text-[10px] text-dim/50 uppercase">Accepts</span>
                  <p className="text-dim text-xs">{round.spec.literal_categories.join(" · ")}</p>
                </div>
              )}
              {round.spec.hard_rejects && (
                <div>
                  <span className="font-mono text-[10px] text-dim/50 uppercase">Rejects</span>
                  <p className="text-dim text-xs">{round.spec.hard_rejects.join(" · ")}</p>
                </div>
              )}
            </div>
          )}

          {!round.specRevealed && (
            <p className="text-dim/40 text-[10px] mt-1">
              Resolution criteria locked. Revealed at round close, before voting.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
