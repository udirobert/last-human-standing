import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import { usePolling } from "../hooks/usePolling.js";
import AppShell, { SHELL_BOTTOM_PAD } from "./AppShell.jsx";
import EmptyState from "./EmptyState.jsx";
import { MascotAvatar } from "./Mascot.jsx";
import { CUE_PRESS } from "../lib/cuelume.js";
import { CompactButton } from "./ui/CraftCta.jsx";

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
    <AppShell phase={ambientPhase}>

      <div className="relative z-10 px-5 pt-10 pb-6 flex items-center gap-4">
        <CompactButton
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-smoke/70 border border-ember/40 flex items-center justify-center hover:border-amber/60"
          aria-label="Back"
        >
          <span className="text-dim text-lg">←</span>
        </CompactButton>
        <div>
          <h2 className="font-display text-3xl text-bone tracking-wide">Today</h2>
          <p className="font-body text-bone/55 text-xs">{user?.displayName ?? "Your record"}</p>
        </div>
      </div>

      <div className={`relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 space-y-3 ${SHELL_BOTTOM_PAD}`}>
        {voterStats && (voterStats.total ?? 0) > 0 && (
          <div className="bg-smoke/80 border border-amber/30 rounded-2xl p-4 backdrop-blur-sm">
            <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2">Your vote accuracy</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl text-amber leading-none tabular-nums">
                {accuracyPct != null ? `${accuracyPct}%` : "—"}
              </span>
              <span className="font-mono text-dim text-xs tabular-nums">
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
          <EmptyState
            motif="coffee"
            title="Nothing logged yet"
            body="Race to the theme location before the survival cap fills."
          />
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
    </AppShell>
  );
}
