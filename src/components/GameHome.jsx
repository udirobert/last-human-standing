import { motion } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import Countdown from './Countdown.jsx';

export default function GameHome({ onCheckIn, onViewFeed, onViewChat, onViewLeaderboard }) {
  const { user } = useWorld();
  const {
    phase, launchAt, currentDay, round, you,
    cohortSize, reservedCount, cohortFull,
  } = useRound();
  const { stats } = useStats();

  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;
  const eliminated = totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0;

  const prizeWld = stats?.prizePool?.balanceWld ?? null;
  const prizeDisplay = prizeWld != null && prizeWld > 0
    ? `${prizeWld.toLocaleString(undefined, { maximumFractionDigits: 2 })} WLD`
    : (reservedCount > 0 ? `${reservedCount} WLD` : '0 WLD');
  const prizeExplorer = stats?.prizePool?.explorerUrl ?? null;

  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';
  const isEliminated = Boolean(you?.isEliminated);
  const checkedInToday = Boolean(you?.checkedInToday);
  const survivedToday = you?.survivedToday;
  const rankToday = you?.rankToday;

  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isLive ? 'bg-neon' : 'bg-amber'}`} />
            <span className={`font-mono text-xs tracking-widest uppercase ${isLive ? 'text-neon' : 'text-amber'}`}>
              {isPrelaunch ? 'Pre-launch' : isLive ? `Live · Day ${currentDay ?? '—'}` : 'Ended'}
            </span>
          </div>
          <div className="font-mono text-dim text-xs">{user?.displayName ?? 'anon'}</div>
        </div>
        <h1 className="font-display text-4xl text-bone tracking-wide animate-glow">LAST HUMAN STANDING</h1>
      </div>

      {/* Pre-launch lobby */}
      {isPrelaunch && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mb-4">
          <div className="bg-smoke border border-amber/40 rounded-3xl p-6 relative overflow-hidden">
            <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Cohort #1 · Day 1 in</p>
            {launchAt
              ? <Countdown targetIso={launchAt} className="font-display text-5xl text-bone leading-none animate-glow" />
              : <p className="font-display text-3xl text-dim">TBA</p>}
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-dim">
              <span>{reservedCount.toLocaleString()} of {cohortSize} humans confirmed</span>
              <span>{cohortPct}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-ember rounded-full overflow-hidden">
              <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${cohortPct}%` }} />
            </div>
            {cohortFull && (
              <p className="text-neon text-xs font-mono mt-3">✓ Cohort full · waiting for launch</p>
            )}
          </div>
          <p className="text-dim text-xs font-mono text-center mt-3">
            Reserved players get the location pin the moment Day 1 opens.
          </p>
        </motion.div>
      )}

      {/* Live: eliminated banner */}
      {isLive && isEliminated && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-5 mb-4">
          <div className="bg-blood/10 border border-blood/40 rounded-3xl p-6 text-center">
            <p className="text-5xl mb-2">💀</p>
            <p className="font-display text-4xl text-blood">YOU'RE OUT</p>
            <p className="text-dim text-sm font-mono mt-1">
              Eliminated on Day {you.eliminatedAtDay ?? '—'}
            </p>
            <p className="text-dim text-xs font-mono mt-3">
              Stay engaged — vote in audit, chat with survivors.
            </p>
          </div>
        </motion.div>
      )}

      {/* Live: today's round */}
      {isLive && !isEliminated && (
        <div className="mx-5 mb-4">
          {!round ? (
            <div className="bg-smoke border border-ember rounded-3xl p-6 text-center">
              <p className="text-3xl mb-2">⏳</p>
              <p className="font-display text-2xl text-bone">Day {currentDay} location not set</p>
              <p className="text-dim text-xs font-mono mt-1">Admin will reveal soon. Check back.</p>
            </div>
          ) : (
            <div className="bg-smoke border border-blood/40 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-blood text-xs tracking-widest uppercase mb-1">Day {round.day} · location</p>
                  <h2 className="font-display text-3xl text-bone">{round.name}</h2>
                </div>
                <div className="bg-blood/20 border border-blood/40 rounded-xl px-3 py-2 text-right">
                  <p className="text-dim text-[10px] font-mono uppercase">Slots</p>
                  <p className="font-display text-2xl text-blood leading-none">
                    {round.slotsRemaining}<span className="text-dim text-base">/{round.survivalCap}</span>
                  </p>
                </div>
              </div>

              {round.prompt && (
                <p className="text-bone text-sm leading-relaxed mb-3">📸 <span className="text-dim">Prompt:</span> {round.prompt}</p>
              )}

              <div className="flex items-center gap-3 mb-4 text-xs font-mono text-dim">
                <span>Window closes in</span>
                <Countdown targetIso={round.closesAt} className="text-amber font-display text-base" />
              </div>

              {checkedInToday ? (
                survivedToday === false ? (
                  <div className="bg-blood/10 border border-blood/30 rounded-xl px-4 py-3 text-center">
                    <p className="text-blood font-display text-xl">TOO LATE — RANK #{rankToday}</p>
                    <p className="text-dim text-xs font-mono mt-1">Cap was {round.survivalCap}. You're out.</p>
                  </div>
                ) : (
                  <div className="bg-neon/10 border border-neon/40 rounded-xl px-4 py-3 text-center">
                    <p className="text-neon font-display text-2xl">✓ RANK #{rankToday} OF {round.survivalCap}</p>
                    <p className="text-dim text-xs font-mono mt-1">You survived Day {round.day}. Locks at window close.</p>
                  </div>
                )
              ) : (
                <button
                  onClick={onCheckIn}
                  className="w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform text-ash bg-blood animate-pulse-blood"
                >
                  CHECK IN HERE
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="mx-5 grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onViewLeaderboard}
          className="bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-dim font-mono text-xs tracking-wide uppercase mb-1">Humans Alive</p>
          <p className="font-display text-3xl text-bone">{(activePlayers ?? reservedCount).toLocaleString()}</p>
          <p className="text-dim text-xs mt-1">{eliminated.toLocaleString()} eliminated · standings →</p>
        </button>
        <button
          onClick={() => prizeExplorer ? window.open(prizeExplorer, '_blank') : onViewLeaderboard()}
          className="bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-dim font-mono text-xs tracking-wide uppercase mb-1">Prize Pool</p>
          <p className="font-display text-3xl text-amber">{prizeDisplay}</p>
          <p className="text-dim text-xs mt-1">{prizeExplorer ? 'On-chain · verify →' : 'World Chain · WLD'}</p>
        </button>
      </div>

      {/* Audit / vote callout */}
      {isLive && (
        <button
          onClick={onViewFeed}
          className="mx-5 mb-3 bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-dim font-mono text-xs tracking-wide uppercase mb-1">Audit feed</p>
          <p className="font-display text-xl text-bone">Vote on today's check-ins</p>
          <p className="text-dim text-xs mt-1">Real / fake — help adjudicate the survivors →</p>
        </button>
      )}

      {/* Chat preview */}
      <button
        onClick={onViewChat}
        className="mx-5 bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-dim font-mono text-xs tracking-wide uppercase">World Chat</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
            <span className="font-mono text-neon text-xs">{(activePlayers ?? reservedCount).toLocaleString()} reachable</span>
          </div>
        </div>
        <p className="text-bone text-sm">Open coordination + trash talk →</p>
      </button>
    </div>
  );
}
