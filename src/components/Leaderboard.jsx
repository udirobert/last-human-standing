import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import { useWorld } from '../world/WorldProvider.jsx';

function shortAddr(addr) {
  if (!addr) return 'anon';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Leaderboard({ onBack }) {
  const [tab, setTab] = useState('today');
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const { phase, currentDay, round, reservedCount, cohortSize, you } = useRound();
  const { stats } = useStats();
  const { user } = useWorld();
  const myAddr = user?.address?.toLowerCase() ?? you?.address?.toLowerCase() ?? null;

  const prizePoolWld = stats?.prizePool?.balanceWld ?? null;
  const prizePoolExplorer = stats?.prizePool?.explorerUrl ?? null;
  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const resp = await fetch('/api/checkins/today', { credentials: 'include' });
        if (!resp.ok) return;
        const json = await resp.json();
        if (!cancelled) setCheckins(json.checkins ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentDay]);

  const survivors = checkins.filter((c) => c.survived);
  const tooLate = checkins.filter((c) => !c.survived);

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
            <p className="font-mono text-dim text-xs">
              {phase === 'live' ? `Day ${currentDay ?? '—'} · ${survivors.length}/${round?.survivalCap ?? '—'} arrived` : 'Pre-launch'}
            </p>
          </div>
        </div>

        {/* Prize pool spotlight */}
        <div className="bg-smoke border border-amber/40 rounded-3xl p-5 mb-5 relative overflow-hidden">
          <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Prize Pool · World Chain</p>
          <div className="flex items-end gap-3 mb-1">
            <span className="font-display text-6xl text-amber leading-none">
              {prizePoolWld != null ? prizePoolWld.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
            </span>
            <span className="font-display text-3xl text-amber/60 mb-1">WLD</span>
          </div>
          <p className="text-dim text-xs font-mono">On-chain · grows with each entry fee</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="font-mono text-dim text-xs">Cohort</p>
              <p className="font-mono text-bone text-xs mt-0.5">{reservedCount}/{cohortSize}</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-dim text-xs">Alive</p>
              <p className="font-mono text-bone text-xs mt-0.5">{activePlayers ?? totalPlayers}</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-dim text-xs">Eliminated</p>
              <p className="font-mono text-bone text-xs mt-0.5">{totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0}</p>
            </div>
          </div>
          {prizePoolExplorer && (
            <button
              onClick={() => window.open(prizePoolExplorer, '_blank')}
              className="mt-3 w-full text-center font-mono text-amber/60 text-xs underline"
            >
              Verify on-chain →
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'late', label: 'Too late' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all ${
                tab === t.id ? 'bg-blood text-bone' : 'bg-smoke text-dim border border-ember'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {phase !== 'live' && (
        <div className="px-5">
          <div className="bg-smoke border border-ember rounded-2xl p-4 text-center">
            <p className="text-dim text-xs font-mono">Standings populate when Day 1 opens.</p>
          </div>
        </div>
      )}

      {phase === 'live' && tab === 'today' && (
        <div className="px-5 space-y-2">
          {loading && checkins.length === 0 && (
            <div className="text-center py-6">
              <div className="w-6 h-6 mx-auto rounded-full border-2 border-blood border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && survivors.length === 0 && (
            <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
              <p className="text-dim text-sm font-mono">No one has checked in yet.</p>
              <p className="text-bone text-xs font-mono mt-1">Be first.</p>
            </div>
          )}
          {survivors.map((c, i) => {
            const isYou = myAddr && c.address?.toLowerCase() === myAddr;
            return (
              <motion.div
                key={c.address || c.rank}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 rounded-2xl p-4 ${
                  isYou ? 'bg-blood/10 border border-blood/40' : 'bg-smoke border border-ember'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg ${
                  c.rank === 1 ? 'text-amber' : c.rank <= 3 ? 'text-bone' : 'text-dim'
                }`}>
                  {c.rank <= 3 ? ['🥇', '🥈', '🥉'][c.rank - 1] : c.rank}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm ${isYou ? 'text-blood' : 'text-bone'}`}>
                      {c.username || shortAddr(c.address)}
                    </span>
                    {isYou && <span className="font-mono text-blood text-xs">(you)</span>}
                  </div>
                  <p className="text-dim text-xs font-mono mt-0.5">
                    {c.distance_m != null ? `${Math.round(c.distance_m)}m from target` : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-neon text-xs font-mono">✓ alive</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {phase === 'live' && tab === 'late' && (
        <div className="px-5 space-y-2">
          {tooLate.length === 0 ? (
            <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
              <p className="text-dim text-sm font-mono">No late arrivals yet.</p>
            </div>
          ) : (
            tooLate.map((c, i) => (
              <motion.div
                key={c.address || c.rank}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-smoke border border-ember rounded-2xl p-4 flex items-center gap-3 opacity-60"
              >
                <span className="text-2xl">💀</span>
                <div className="flex-1">
                  <p className="font-mono text-bone text-sm line-through">{c.username || shortAddr(c.address)}</p>
                  <p className="text-dim text-xs mt-0.5">Arrived as #{c.rank}</p>
                </div>
                <p className="font-mono text-dim text-xs">{c.distance_m != null ? `${Math.round(c.distance_m)}m` : ''}</p>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
