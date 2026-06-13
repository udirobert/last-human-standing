import { useWorld } from "../world/WorldProvider.jsx";
import { usePolling } from "../hooks/usePolling.js";

export default function PlayerHistory({ onBack }) {
  const { user } = useWorld();

  const { data: todayRes } = usePolling("/api/checkins/today", {
    intervalMs: 30_000,
    transform: (json) => json.checkins ?? [],
    initial: [],
  });

  const myCheckins = todayRes.filter(
    (c) => c.address?.toLowerCase() === user?.address?.toLowerCase(),
  );

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body">
      <div className="px-5 pt-12 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
          <span className="text-dim text-lg">←</span>
        </button>
        <div>
          <h2 className="font-display text-3xl text-bone tracking-wide">HISTORY</h2>
          <p className="font-mono text-dim text-xs">{user?.displayName ?? "Your record"}</p>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8">
        {myCheckins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-4xl">📋</p>
            <p className="text-dim font-mono text-sm">No check-ins yet today.</p>
            <p className="text-dim/70 font-mono text-xs text-center">Your past check-ins and rankings will appear here.</p>
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
