import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import { usePolling } from "../hooks/usePolling.js";
import AmbientBackdrop from "./AmbientBackdrop.jsx";
import DozingCat from "./ui/DozingCat.jsx";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import { MascotAvatar } from "./Mascot.jsx";
import { CUE_PRESS } from "../lib/cuelume.js";

export default function PlayerHistory({ onBack }) {
  const { user } = useWorld();
  const { phase } = useRound();

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

  const ambientPhase = phase === "live" ? "live" : phase === "ended" ? "ended" : "prelaunch";

  return (
    <div className="relative min-h-screen flex flex-col font-body overflow-hidden bg-transparent">
      <AmbientBackdrop phase={ambientPhase} />

      <div className="relative z-10 px-5 pt-12 pb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          {...CUE_PRESS}
          className="w-10 h-10 rounded-xl bg-smoke/70 border border-ember/40 flex items-center justify-center hover:border-amber/60 active:scale-90 transition-all"
          aria-label="Back"
        >
          <span className="text-dim text-lg">←</span>
        </button>
        <div>
          <h2 className="font-display text-3xl text-bone tracking-wide">Today</h2>
          <p className="font-body text-bone/55 text-xs">{user?.displayName ?? "Your record"}</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 px-5 pb-8 space-y-3">
        {voterStats && (voterStats.total ?? 0) > 0 && (
          <div className="bg-smoke/80 border border-amber/30 rounded-2xl p-4 backdrop-blur-sm">
            <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2">Your vote accuracy</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl text-amber leading-none">
                {accuracyPct != null ? `${accuracyPct}%` : "—"}
              </span>
              <span className="font-mono text-dim text-xs">
                ({voterStats.correct}/{voterStats.total} correct)
              </span>
            </div>
            <p className="text-bone/55 text-[11px] font-body mt-2 leading-relaxed">
              How often the crowd agreed with the final ruling on submissions you voted on.
            </p>
          </div>
        )}

        <p className="font-mono text-dim text-[10px] uppercase tracking-wider pt-2">
          Today&apos;s check-ins
        </p>
        {myCheckins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 px-4">
            <DozingCat size={72} />
            <p className="font-display text-2xl text-bone/80">Nothing logged yet</p>
            <p className="text-bone/55 font-body text-sm text-center leading-relaxed max-w-xs">
              Race to the theme location before the survival cap fills.
            </p>
            <MotifFrieze className="w-full mt-4 opacity-85" />
          </div>
        ) : (
          <div className="space-y-3">
            {myCheckins.slice(0, 20).map((ck) => (
              <div key={ck.rank} className="bg-smoke/80 border border-ember/40 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MascotAvatar status={ck.survived ? "alive" : "eliminated"} size={24} />
                    <p className="font-display text-lg text-bone">
                      {ck.survived ? "Survived" : "Out"} #{ck.rank}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-dim">
                    {new Date(ck.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex gap-3 text-xs font-mono text-dim">
                  {ck.distance_m != null && <span>{Math.round(ck.distance_m)}m</span>}
                  {ck.username && <span>@{ck.username}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
