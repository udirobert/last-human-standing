import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GAME_STATS, TODAY_THEME } from '../data/game';

export default function GameHome({ onCheckIn, onViewFeed, onViewChat, onViewLeaderboard }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 6, minutes: 23, seconds: 47 });
  const [playerCount, setPlayerCount] = useState(GAME_STATS.totalPlayers);
  const [showElimination, setShowElimination] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) return { hours, minutes, seconds: seconds - 1 };
        if (minutes > 0) return { hours, minutes: minutes - 1, seconds: 59 };
        if (hours > 0) return { hours: hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Occasionally drop player count
  useEffect(() => {
    const drop = setInterval(() => {
      if (Math.random() > 0.6) {
        const dropAmount = Math.floor(Math.random() * 3) + 1;
        setPlayerCount(p => Math.max(p - dropAmount, 1));
        setShowElimination(true);
        setTimeout(() => setShowElimination(false), 2500);
      }
    }, 4000);
    return () => clearInterval(drop);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            <span className="font-mono text-neon text-xs tracking-widest uppercase">Live · Day {GAME_STATS.day}</span>
          </div>
          <div className="font-mono text-dim text-xs">0xHuman_7734</div>
        </div>
        <h1 className="font-display text-4xl text-bone tracking-wide animate-glow">LAST HUMAN STANDING</h1>
      </div>

      {/* Main count — the drama */}
      <motion.div
        key={playerCount}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        className="relative mx-5 mb-4"
      >
        <div className="bg-smoke border border-blood/40 rounded-3xl p-6 relative overflow-hidden">
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)'
            }}
          />

          <p className="font-mono text-dim text-xs tracking-widest uppercase mb-1">Humans Remaining</p>
          <div className="flex items-end gap-3">
            <span className="font-display text-7xl text-blood leading-none animate-glow">
              {playerCount.toLocaleString()}
            </span>
            {showElimination && (
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-dim font-mono text-sm mb-2 text-blood"
              >
                -{Math.floor(Math.random() * 3) + 1} eliminated
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex-1 bg-ember rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blood rounded-full transition-all duration-1000"
                style={{ width: `${(playerCount / (playerCount + GAME_STATS.eliminated)) * 100}%` }}
              />
            </div>
            <span className="font-mono text-dim text-xs">{GAME_STATS.eliminated.toLocaleString()} out</span>
          </div>
        </div>
      </motion.div>

      {/* Elimination alert */}
      {showElimination && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mx-5 mb-3 bg-blood/10 border border-blood/40 rounded-2xl px-4 py-2 flex items-center gap-2"
        >
          <span className="text-lg">💀</span>
          <span className="font-mono text-blood text-xs">Someone just missed their check-in</span>
        </motion.div>
      )}

      {/* Today's Challenge */}
      <div className="mx-5 mb-4">
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${TODAY_THEME.color}15 0%, #1A1A1A 100%)`, borderColor: `${TODAY_THEME.color}40`, borderWidth: 1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-xs tracking-widest uppercase mb-0.5" style={{ color: TODAY_THEME.color }}>Today's Theme</p>
              <h2 className="font-display text-4xl text-bone tracking-wide">{TODAY_THEME.theme}</h2>
            </div>
            <span className="text-5xl">{TODAY_THEME.emoji}</span>
          </div>
          <p className="text-dim text-sm mb-4">{TODAY_THEME.description}</p>

          {/* Countdown */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1 items-center">
              <div className="bg-ash rounded-lg px-2 py-1">
                <span className="font-display text-2xl text-amber">{pad(timeLeft.hours)}</span>
              </div>
              <span className="text-dim font-mono text-sm">:</span>
              <div className="bg-ash rounded-lg px-2 py-1">
                <span className="font-display text-2xl text-amber">{pad(timeLeft.minutes)}</span>
              </div>
              <span className="text-dim font-mono text-sm">:</span>
              <div className="bg-ash rounded-lg px-2 py-1">
                <span className="font-display text-2xl text-amber">{pad(timeLeft.seconds)}</span>
              </div>
            </div>
            <span className="text-dim font-mono text-xs">until elimination</span>
          </div>

          {checkedIn ? (
            <div className="flex items-center gap-2 bg-neon/10 rounded-xl px-4 py-3 border border-neon/30">
              <span className="text-neon text-xl">✅</span>
              <span className="font-mono text-neon text-sm">Checked in · Awaiting verification</span>
            </div>
          ) : (
            <button
              onClick={() => { setCheckedIn(true); onCheckIn(); }}
              className="w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform text-ash animate-pulse-blood"
              style={{ background: TODAY_THEME.color }}
            >
              CHECK IN NOW
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mx-5 grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onViewFeed}
          className="bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-dim font-mono text-xs tracking-wide uppercase mb-1">Submissions</p>
          <p className="font-display text-3xl text-bone">1,038</p>
          <p className="text-dim text-xs mt-1">Vote on real vs fake →</p>
        </button>
        <button
          onClick={onViewLeaderboard}
          className="bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-dim font-mono text-xs tracking-wide uppercase mb-1">Prize Pool</p>
          <p className="font-display text-3xl text-amber">{GAME_STATS.prizePool}</p>
          <p className="text-dim text-xs mt-1">On-chain · World Wallet →</p>
        </button>
      </div>

      {/* Chat preview */}
      <button
        onClick={onViewChat}
        className="mx-5 bg-smoke border border-ember rounded-2xl p-4 text-left active:scale-95 transition-transform"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-dim font-mono text-xs tracking-wide uppercase">World Chat</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
            <span className="font-mono text-neon text-xs">247 online</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-bone text-sm"><span className="text-dim font-mono text-xs">0xHuman:</span> "the prize pool is at 2.4 ETH now. i'm not sleeping"</p>
          <p className="text-bone text-sm"><span className="text-dim font-mono text-xs">0xGhost:</span> "flagging everyone who went to starbucks 💀"</p>
        </div>
        <p className="text-blood text-xs font-mono mt-2">Open trash talk →</p>
      </button>
    </div>
  );
}
