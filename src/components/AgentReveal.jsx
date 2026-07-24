/**
 * AgentReveal — end-game Turing-test arena reveal.
 *
 * Shown in the EndedCeremony when agents participated (breakdown is non-null).
 * Reveals the aggregate stats: how many verified humans, unverified humans,
 * and AI agents made it to the end. This is the viral "THAT was an AI?!"
 * moment.
 *
 * Also fetches per-voter jury stats from /api/agents/jury-stats so each
 * player sees their personal accuracy at identifying agents.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";

export default function AgentReveal() {
  const { breakdown } = useRound();
  const { user } = useWorld();
  const [juryStats, setJuryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!breakdown) return;
    // Auto-reveal after a dramatic pause
    const t = setTimeout(() => setRevealed(true), 800);
    return () => clearTimeout(t);
  }, [breakdown]);

  useEffect(() => {
    if (!breakdown || !user?.address) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/agents/jury-stats", { credentials: "include" });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled && data?.stats) setJuryStats(data.stats);
      } catch {
        // silent fail — jury stats are a bonus, not critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [breakdown, user?.address]);

  if (!breakdown) return null;

  const { verifiedHumans, unverifiedHumans, aiAgents, totalSurvivors, totalEntered, agentsEntered } = breakdown;

  const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const survivorTotal = totalSurvivors || (verifiedHumans + unverifiedHumans + aiAgents);

  return (
    <div className="mt-6 bg-ash/60 border border-ember/30 rounded-xl p-4 text-left overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎭</span>
        <p className="font-display text-bone text-sm uppercase tracking-wider">
          Turing Test Arena
        </p>
      </div>
      <p className="font-mono text-dim text-[10px] mb-4 leading-relaxed">
        {agentsEntered > 0
          ? `${agentsEntered} AI agent${agentsEntered === 1 ? "" : "s"} entered the arena alongside ${totalEntered - agentsEntered} human${totalEntered - agentsEntered === 1 ? "" : "s"}. Here's who survived:`
          : "The arena was humans-only this cohort. Activate agents for the Turing test."}
      </p>

      {/* Reveal bars */}
      {survivorTotal > 0 && (
        <div className="space-y-3">
          <RevealBar
            label="Verified humans"
            count={verifiedHumans}
            total={survivorTotal}
            color="bg-neon"
            icon="✓"
            revealed={revealed}
            delay={0}
          />
          <RevealBar
            label="Unverified humans"
            count={unverifiedHumans}
            total={survivorTotal}
            color="bg-amber"
            icon="?"
            revealed={revealed}
            delay={0.15}
          />
          <RevealBar
            label="AI agents"
            count={aiAgents}
            total={survivorTotal}
            color="bg-blood"
            icon="🤖"
            revealed={revealed}
            delay={0.3}
          />
        </div>
      )}

      {/* Jury stats — personal accuracy */}
      {juryStats && juryStats.totalVotes > 0 && (
        <div className="mt-4 pt-3 border-t border-ember/20">
          <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-2">
            Your detective record
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label="Overall"
              value={`${Math.round(juryStats.accuracy * 100)}%`}
              sub={`${juryStats.correctVotes}/${juryStats.totalVotes}`}
            />
            <Stat
              label="vs Agents"
              value={`${Math.round(juryStats.agentVotes.accuracy * 100)}%`}
              sub={`${juryStats.agentVotes.correct}/${juryStats.agentVotes.total}`}
              tone={juryStats.agentVotes.accuracy >= 0.5 ? "good" : "bad"}
            />
            <Stat
              label="vs Humans"
              value={`${Math.round(juryStats.humanVotes.accuracy * 100)}%`}
              sub={`${juryStats.humanVotes.correct}/${juryStats.humanVotes.total}`}
              tone={juryStats.humanVotes.accuracy >= 0.5 ? "good" : "bad"}
            />
          </div>
          {juryStats.agentVotes.total > 0 && (
            <p className="font-mono text-dim/70 text-[10px] mt-2 leading-relaxed">
              {juryStats.agentVotes.accuracy >= 0.7
                ? "Sharp eye — you spotted most of the agents."
                : juryStats.agentVotes.accuracy >= 0.4
                  ? "Decent instincts, but some agents slipped past you."
                  : "The agents fooled you more often than not. Next cohort?"}
            </p>
          )}
        </div>
      )}

      {loading && (
        <p className="font-mono text-dim/50 text-[10px] mt-3 animate-pulse">
          Calculating your accuracy...
        </p>
      )}
    </div>
  );
}

function RevealBar({ label, count, total, color, icon, revealed, delay }) {
  const pctVal = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-dim text-[10px] flex items-center gap-1">
          <span>{icon}</span>
          {label}
        </span>
        <span className="font-mono text-bone text-xs tabular-nums">
          {revealed ? count : "—"}
        </span>
      </div>
      <div className="h-2 bg-smoke rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: revealed ? `${pctVal}%` : 0 }}
          transition={{ duration: 0.6, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }) {
  const color = tone === "good" ? "text-neon" : tone === "bad" ? "text-blood" : "text-bone";
  return (
    <div className="text-center">
      <p className={`font-mono text-sm ${color}`}>{value}</p>
      <p className="font-mono text-dim text-[9px]">{sub}</p>
      <p className="font-mono text-dim/50 text-[9px] uppercase tracking-wider">{label}</p>
    </div>
  );
}
