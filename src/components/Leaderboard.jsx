import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GAME_STATS } from '../data/game';
import { useRound } from '../world/RoundProvider.jsx';

const SURVIVORS = [
  { rank: 1, user: "0xHuman_7734", streak: 47, status: "verified", badge: "🔥", days: "47 days", you: true },
  { rank: 2, user: "0xLegacy_0001", streak: 47, status: "verified", badge: "👑", days: "47 days" },
  { rank: 3, user: "0xSurvivor_2291", streak: 47, status: "verified", badge: "⚔️", days: "47 days" },
  { rank: 4, user: "0xLastOnes_8823", streak: 47, status: "verified", badge: "🎯", days: "47 days" },
  { rank: 5, user: "0xGhost_4459", streak: 46, status: "pending", badge: "👻", days: "46 days" },
  { rank: 6, user: "0xElite_0042", streak: 45, status: "verified", badge: "⚡", days: "45 days" },
  { rank: 7, user: "0xSpectre_1107", streak: 44, status: "flagged", badge: "⚠️", days: "44 days" },
  { rank: 8, user: "0xPersist_7723", streak: 43, status: "verified", badge: "💎", days: "43 days" },
];

const RECENTLY_ELIMINATED = [
  { user: "0xFailed_3391", day: 46, reason: "Missed check-in" },
  { user: "0xBot_8821", day: 45, reason: "Failed verification (89% fake votes)" },
  { user: "0xCareless_1190", day: 44, reason: "Missed check-in" },
  { user: "0xSloppy_0023", day: 43, reason: "Failed verification" },
];

export default function Leaderboard({ onBack }) {
  const [tab, setTab] = useState('survivors');
  const [prizePool] = useState(2.4);
  const { round, verification } = useRound();

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
            <span className="text-dim text-lg">←</span>
          </button>
          <div>
            <h2 className="font-display text-3xl text-bone tracking-wide">STANDINGS</h2>
            <p className="font-mono text-dim text-xs">Day 47 · {GAME_STATS.totalPlayers.toLocaleString()} alive</p>
          </div>
        </div>

        {/* Prize pool spotlight */}
        {round && (
          <div
            className={`border rounded-2xl p-4 mb-3 ${
              round.state === "active"
                ? "bg-neon/10 border-neon/30"
                : "bg-amber/10 border-amber/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`font-mono text-xs tracking-widest uppercase ${
                  round.state === "active" ? "text-neon" : "text-amber"
                }`}
              >
                {round.state === "active" ? "Prize round active" : "Warmup round"}
              </p>
              <p className="font-mono text-dim text-xs">
                {round.paidCount}/{round.joinQuorum} joined
              </p>
            </div>
            {round.state !== "active" && (
              <div className="h-1.5 bg-ember rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-amber rounded-full"
                  style={{ width: `${Math.min(100, (round.paidCount / round.joinQuorum) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-dim text-xs mt-2">
              Check-ins finalize at <span className="font-mono text-bone">{verification.voteQuorum}</span> votes
              {verification.voteQuorum !== verification.voteQuorumNormal ? " (low activity today)" : ""}.
            </p>
          </div>
        )}
        <div className="bg-smoke border border-amber/40 rounded-3xl p-5 mb-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, #FFB800, transparent 70%)' }} />
          <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Prize Pool · World Wallet</p>
          <div className="flex items-end gap-3 mb-1">
            <span className="font-display text-6xl text-amber leading-none">{prizePool}</span>
            <span className="font-display text-3xl text-amber/60 mb-1">ETH</span>
          </div>
          <p className="text-dim text-xs font-mono">~${(prizePool * 2800).toLocaleString()} USD · Locked on-chain until last human remains</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Your share", val: "0.00193 ETH" },
              { label: "Entry fees", val: "12.47 ETH" },
              { label: "Sponsors", val: "+ coming" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-mono text-dim text-xs">{item.label}</p>
                <p className="font-mono text-bone text-xs mt-0.5">{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['survivors', 'eliminated'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all ${
                tab === t ? 'bg-blood text-bone' : 'bg-smoke text-dim border border-ember'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'survivors' ? (
        <div className="px-5 space-y-2">
          {SURVIVORS.map((s, i) => (
            <motion.div
              key={s.user}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-3 rounded-2xl p-4 ${
                s.you ? 'bg-blood/10 border border-blood/40' : 'bg-smoke border border-ember'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg ${
                s.rank === 1 ? 'text-amber' : s.rank <= 3 ? 'text-bone' : 'text-dim'
              }`}>
                {s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : s.rank}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm ${s.you ? 'text-blood' : 'text-bone'}`}>
                    {s.user}
                  </span>
                  {s.you && <span className="font-mono text-blood text-xs">(you)</span>}
                  <span className="text-base">{s.badge}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-mono ${
                    s.status === 'verified' ? 'text-neon' :
                    s.status === 'pending' ? 'text-amber' : 'text-blood'
                  }`}>
                    {s.status === 'verified' ? '✅' : s.status === 'pending' ? '⏳' : '⚠️'} {s.days}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="font-mono text-dim text-xs">share</p>
                <p className="font-mono text-neon text-xs">{(prizePool / GAME_STATS.totalPlayers).toFixed(5)} ETH</p>
              </div>
            </motion.div>
          ))}

          <div className="py-4 text-center">
            <p className="text-dim font-mono text-xs">+ {(GAME_STATS.totalPlayers - SURVIVORS.length).toLocaleString()} more survivors</p>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-2">
          <div className="bg-blood/5 border border-blood/20 rounded-2xl p-3 mb-2">
            <p className="text-blood font-mono text-xs text-center">
              💀 {GAME_STATS.eliminated.toLocaleString()} humans eliminated so far
            </p>
          </div>
          {RECENTLY_ELIMINATED.map((e, i) => (
            <motion.div
              key={e.user}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-smoke border border-ember rounded-2xl p-4 flex items-center gap-3 opacity-60"
            >
              <span className="text-2xl">💀</span>
              <div className="flex-1">
                <p className="font-mono text-bone text-sm line-through">{e.user}</p>
                <p className="text-dim text-xs mt-0.5">{e.reason}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-dim text-xs">Day {e.day}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
