import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";
import { getWildcardMascot } from "../lib/copy.js";
import MascotGuide from "./ui/MascotGuide.jsx";

/**
 * Wildcard revival panel — shown to eliminated players (jury) on Day 4.
 * Jurors can vote for one eliminated player to revive back into the game.
 * The revival triggers automatically when close_day runs on Day 4.
 *
 * Reads:
 *   - you.isEliminated, you.isJury from game state
 *   - currentDay from round context
 *   - /api/revive-votes/:day for the live tally
 *   - /api/cohort/roster for the list of eliminated players
 */
export default function WildcardPanel() {
  const { currentDay, you } = useRound();
  const { user } = useWorld();
  const [candidates, setCandidates] = useState([]);
  const [tally, setTally] = useState({});
  const [voted, setVoted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const mascot = getWildcardMascot({ voted: voted !== null });

  const myAddr = user?.address?.toLowerCase() ?? null;
  const isJury = Boolean(you?.isEliminated);
  const isWildcardDay = Number(currentDay) === 4;

  // Load eliminated players + current tally
  useEffect(() => {
    if (!isJury || !isWildcardDay) return;
    let cancelled = false;

    async function load() {
      try {
        const [rosterResp, tallyResp] = await Promise.all([
          fetch("/api/cohort/roster", { credentials: "include" }),
          fetch(`/api/revive-votes/4`, { credentials: "include" }),
        ]);
        if (cancelled) return;

        const rosterData = await rosterResp.json().catch(() => ({}));
        const eliminated = (rosterData?.roster || rosterData || [])
          .filter((p) => p.eliminated && p.address?.toLowerCase() !== myAddr);
        if (!cancelled) setCandidates(eliminated);

        const tallyData = await tallyResp.json().catch(() => ({}));
        if (!cancelled) setTally(tallyData?.tally || {});
      } catch {
        if (!cancelled) setError("Failed to load revival data");
      }
    }

    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isJury, isWildcardDay, myAddr]);

  const handleVote = async (candidateAddress) => {
    if (submitting || voted) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/revive-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ candidateAddress, day: 4 }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "vote_failed");
      }
      setVoted(candidateAddress);
      // Refresh tally
      const tallyResp = await fetch(`/api/revive-votes/4`, { credentials: "include" });
      const tallyData = await tallyResp.json().catch(() => ({}));
      setTally(tallyData?.tally || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "vote_failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isJury || !isWildcardDay || candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    const va = tally[a.address?.toLowerCase()] || 0;
    const vb = tally[b.address?.toLowerCase()] || 0;
    return vb - va;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 bg-purple-500/10 border border-purple-400/30 rounded-3xl p-5"
    >
      <div className="flex items-start gap-2 mb-3">
        <MascotGuide
          variant={mascot.variant}
          size={48}
          message={mascot.message}
          position="top"
          className="shrink-0"
        />
        <div>
          <p className="font-display text-xl text-purple-300">Wildcard Revival</p>
          <p className="text-dim text-[10px] font-mono uppercase tracking-widest">Day 4 · Jury vote</p>
        </div>
      </div>

      {error && (
        <p className="text-blood text-[10px] font-mono mb-2">{error}</p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sorted.map((c) => {
          const addr = c.address?.toLowerCase() ?? "";
          const votes = tally[addr] || 0;
          const isMyVote = voted === c.address;
          const shortAddr = c.address ? `${c.address.slice(0, 6)}…${c.address.slice(-4)}` : "—";
          return (
            <button
              key={c.address}
              onClick={() => handleVote(c.address)}
              disabled={submitting || voted !== null}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-[transform,background-color,border-color,opacity] active:scale-[0.98] ${
                isMyVote
                  ? "bg-purple-500/20 border-purple-400/50"
                  : voted
                  ? "bg-ash/40 border-ember/30 opacity-60"
                  : "bg-ash/60 border-ember/40 hover:border-purple-400/40"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-mono text-bone truncate">
                  {c.username ? `@${c.username}` : shortAddr}
                </span>
                {isMyVote && <span className="text-purple-300 text-xs">✓ your vote</span>}
              </div>
              <span className="text-purple-300 font-mono text-sm tabular-nums flex-shrink-0">
                {votes} {votes === 1 ? "vote" : "votes"}
              </span>
            </button>
          );
        })}
      </div>

      {voted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-purple-300 text-[11px] font-mono text-center mt-3"
        >
          Vote cast. The revival triggers when Day 4 closes.
        </motion.p>
      )}

      {!voted && (
        <p className="text-dim/70 text-[10px] font-mono text-center mt-2">
          One vote per juror. The player with the most votes comes back.
        </p>
      )}
    </motion.div>
  );
}
