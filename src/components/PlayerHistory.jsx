import { useWorld } from "../world/WorldProvider.jsx";
import { usePolling } from "../hooks/usePolling.js";

export default function PlayerHistory({ onBack }) {
  const { user } = useWorld();

  const { data: todayRes } = usePolling("/api/checkins/today", {
    intervalMs: 30_000,
    transform: (json) => json.checkins ?? [],
    initial: [],
  });

  const { data: voterStats } = usePolling(
    user?.address ? `/api/voter-stats/${user.address}` : null,
    {
      intervalMs: 60_000,
      transform: (json) => json,
      initial: null,
    },
  );

  const myCheckins = todayRes.filter(
    (c) => c.address?.toLowerCase() === user?.address?.toLowerCase(),
  );

  const accuracyPct = voterStats?.accuracy != null
    ? Math.round(voterStats.accuracy * 100)
    : null;

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body">
      <div className="px-5 pt-12 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
          <span className="text-dim text-lg">←</span>
        </button>
        <div>
          <h2 className="font-display text-3xl text-bone tracking-wide">TODAY</h2>
          <p className="font-mono text-dim text-xs">{user?.displayName ?? "Your record"}</p>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-3">
        {/* Voter accuracy callout — the single most rewarding stat for
            a returning player. Only shown once they've voted. */}
        {voterStats && (voterStats.total ?? 0) > 0 && (
          <div className="bg-smoke border border-amber/30 rounded-2xl p-4">
            <p className="font-mono text-amber text-xs tracking-widest uppercase mb-2">Your vote accuracy</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl text-amber leading-none">
                {accuracyPct != null ? `${accuracyPct}%` : "—"}
              </span>
              <span className="font-mono text-dim text-xs">
                ({voterStats.correct}/{voterStats.total} correct)
              </span>
            </div>
            <p className="text-dim text-[11px] font-mono mt-2 leading-relaxed">
              How often the crowd agreed with the final ruling on submissions you voted on.
            </p>
          </div>
        )}

        <p className="font-mono text-dim text-xs uppercase tracking-wider pt-2">
          Today&apos;s check-ins
        </p>
        {myCheckins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-4xl">📋</p>
            <p className="text-dim font-mono text-sm">No check-ins yet today.</p>
            <p className="text-dim/70 font-mono text-xs text-center">Race to the theme location before the cap fills.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myCheckins.slice(0, 20).map((ck) => (
              <div key={ck.rank} className="bg-smoke border border-ember rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-display text-lg text-bone">
                    {ck.survived ? "✅" : "💀"} #{ck.rank}
                  </p>
                  <span className="font-mono text-xs text-dim">
                    {new Date(ck.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex gap-3 text-xs font-mono text-dim">
                  {ck.distance_m != null && <span>📍 {Math.round(ck.distance_m)}m</span>}
                  {ck.username && <span>@{ck.username}</span>}
                  <span>{ck.survived ? "Survived" : "Eliminated"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
