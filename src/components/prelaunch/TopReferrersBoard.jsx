import { usePolling } from "../../hooks/usePolling.js";

/**
 * Top-5 referral leaderboard. Polls /api/referral-board.
 * Pure: takes no props, renders a leaderboard section or returns null
 * if the board is empty.
 */
export default function TopReferrersBoard({ className = "" }) {
  const { data: refBoard = [] } = usePolling("/api/referral-board", {
    intervalMs: 30_000,
    transform: (json) => json?.board ?? [],
    initial: [],
  });

  if (!refBoard.length) return null;

  return (
    <div className={`bg-smoke border border-ember rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-display text-bone text-xl">REFERRAL BOARD</p>
        <p className="font-mono text-dim text-xs">Top 5</p>
      </div>
      <div className="space-y-2">
        {refBoard.slice(0, 5).map((row, i) => (
          <div
            key={`${row.referralCode}-${i}`}
            className="flex items-center justify-between bg-ash rounded-xl px-3 py-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-dim text-xs w-5 tabular-nums">#{i + 1}</span>
              <span className="text-bone text-sm truncate">{row.name}</span>
            </div>
            <span className="font-mono text-amber text-xs tabular-nums">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
