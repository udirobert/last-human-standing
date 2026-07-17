import { useEffect, useState } from 'react';
import { useRound } from '../world/RoundProvider.jsx';
import ThemeMotif from './ui/ThemeMotif.jsx';
import { COHORT_SCHEDULE } from '../data/game.js';

/**
 * DayZeroBanner — the pre-launch ritual moment.
 * Activates at T-2h before a round opens, showing the theme-of-the-next-day
 * with a pulsing motif and countdown. At T-0 it morphs into the check-in CTA.
 */
export default function DayZeroBanner() {
  const { phase, currentDay, rounds } = useRound();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Only show during prelaunch or live phases
  if (phase !== 'prelaunch' && phase !== 'live') return null;

  // Find the next round that's about to open
  const targetMs = getNextRoundOpensAt(now);
  if (!targetMs) return null;

  const hoursUntil = (targetMs - now) / (1000 * 60 * 60);

  // Only show banner when T-2h or less
  if (hoursUntil > 2 || hoursUntil < -1) return null;

  const nextRound = getNextRound(now);
  if (!nextRound) return null;

  const isTMinus = hoursUntil <= 0;
  const theme = COHORT_SCHEDULE.find(s => s.day === nextRound.day) || COHORT_SCHEDULE[0];

  return (
    <div
      className={`relative overflow-hidden border-2 ${
        isTMinus ? 'border-neon bg-neon/5' : 'border-amber bg-amber/5'
      } transition-all duration-500`}
    >
      {/* Pulsing background motif */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className={isTMinus ? 'animate-pulse-slow' : 'animate-pulse'}>
          <ThemeMotif emoji={theme.emoji} size={200} />
        </div>
      </div>

      {/* Content */}
      <div className="relative px-6 py-8 text-center">
        <div className="mb-4">
          <div className={`inline-block ${isTMinus ? 'animate-bounce-subtle' : 'animate-pulse'}`}>
            <ThemeMotif emoji={theme.emoji} size={64} />
          </div>
        </div>

        <p className={`font-mono text-xs tracking-widest uppercase mb-2 ${
          isTMinus ? 'text-neon' : 'text-amber'
        }`}>
          {isTMinus ? 'Day is live' : `Day ${nextRound.day} opens in`}
        </p>

        {!isTMinus && (
          <p className="font-display text-4xl text-bone mb-3 tabular-nums">
            {formatCountdown(targetMs - now)}
          </p>
        )}

        <p className="font-display text-xl text-bone mb-2">
          {theme.theme}
        </p>

        <p className="font-body text-sm text-bone/60 max-w-sm mx-auto">
          {theme.description}
        </p>

        {isTMinus && (
          <div className="mt-4 pt-4 border-t border-neon/20">
            <p className="font-mono text-xs text-neon uppercase tracking-widest">
              Check in now
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getNextRoundOpensAt(now) {
  const rounds = COHORT_SCHEDULE.map(s => ({
    ...s,
    opensAt: new Date(s.date + 'T18:00:00Z').getTime(),
  }));

  const futureRounds = rounds.filter(r => r.opensAt > now);
  if (futureRounds.length === 0) return null;

  return futureRounds[0].opensAt;
}

function getNextRound(now) {
  const rounds = COHORT_SCHEDULE.map(s => ({
    ...s,
    opensAt: new Date(s.date + 'T18:00:00Z').getTime(),
  }));

  const futureRounds = rounds.filter(r => r.opensAt > now);
  if (futureRounds.length === 0) return null;

  return futureRounds[0];
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
