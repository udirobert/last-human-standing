import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import TrustBadge from './TrustBadge.jsx';
import EarlyBadge from './prelaunch/EarlyBadge.jsx';
import PrelaunchPanel from './prelaunch/PrelaunchPanel.jsx';
import ModeBanner from './ModeBanner.jsx';
import MissionBoard from './MissionBoard.jsx';
import ActivityFeed from './ActivityFeed.jsx';
import NetworkPill from './ui/NetworkPill.jsx';

export default function GameHome({ onCheckIn, onViewFeed, onViewChat, onViewLeaderboard, onViewHistory, onRefresh }) {
  const { user } = useWorld();
  const {
    phase, launchAt, currentDay,
    cohortSize, reservedCount, cohortFull,
    cohort: cohortSplit,
    usesDemoState, refresh: refreshRound,
  } = useRound();
  const { stats } = useStats();

  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [pwaDismissed, setPwaDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;
  const eliminated = totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0;

  const prizeWld = stats?.prizePool?.balanceWld ?? null;
  const prizeDisplay = prizeWld != null && prizeWld > 0
    ? `${prizeWld.toLocaleString(undefined, { maximumFractionDigits: 2 })} WLD`
    : '— WLD';
  const prizeExplorer = stats?.prizePool?.explorerUrl ?? null;

  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      <NetworkPill onRetry={onRefresh || refreshRound} error={usesDemoState} />

      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isLive ? 'bg-neon' : 'bg-amber'}`} />
            <span className={`font-mono text-xs tracking-widest uppercase ${isLive ? 'text-neon' : 'text-amber'}`}>
              {isPrelaunch ? 'Pre-launch' : isLive ? `Live · Day ${currentDay ?? '—'}` : 'Ended'}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <TrustBadge />
              {isPrelaunch && <EarlyBadge size="sm" reservedAt={user?.reservedAt} />}
              <ModeBanner />
            </div>
            <button
              onClick={onViewHistory}
              className="font-mono text-dim text-xs hover:text-bone transition-colors underline decoration-dotted underline-offset-2"
            >
              {user?.displayName ?? 'anon'}
            </button>
          </div>
        </div>
        <h1 className="font-display text-4xl text-bone tracking-wide animate-glow">LAST HUMAN STANDING</h1>
      </div>

      <MissionBoard
        onCheckIn={onCheckIn}
        onViewFeed={onViewFeed}
      />

      <ActivityFeed />

      {isPrelaunch && (
        <PrelaunchPanel
          launchAt={launchAt}
          cohort={cohortSplit ?? {
            size: cohortSize,
            paidSlots: 25,
            freeSlots: 25,
            paidCount: 0,
            freeCount: 0,
          }}
          prizePool={stats?.prizePool}
          referralCode={user?.referralCode}
          referralCount={user?.referralCount ?? 0}
          reservedAt={user?.reservedAt}
        />
      )}

      <div className="px-5 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-smoke rounded-2xl p-4 border border-ember">
          <p className="text-dim text-xs font-mono mb-1">Prize Pool</p>
          <p className="font-display text-2xl text-amber leading-none">{prizeDisplay}</p>
          {prizeExplorer && <a href={prizeExplorer} target="_blank" rel="noopener" className="text-[10px] font-mono text-dim underline">view on chain</a>}
        </div>
        <div className="bg-smoke rounded-2xl p-4 border border-ember">
          <p className="text-dim text-xs font-mono mb-1">Survivors</p>
          <p className="font-display text-2xl text-bone leading-none">{activePlayers ?? '—'}</p>
          <p className="text-[10px] font-mono text-dim mt-1">{eliminated} eliminated</p>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <button onClick={onViewFeed} className="bg-smoke border border-ember rounded-2xl py-4 text-bone font-mono text-sm">Feed</button>
          <button onClick={onViewChat} className="bg-smoke border border-ember rounded-2xl py-4 text-bone font-mono text-sm">Chat</button>
          <button onClick={onViewLeaderboard} className="bg-smoke border border-ember rounded-2xl py-4 text-bone font-mono text-sm">Board</button>
        </div>

        {pwaPrompt && !pwaDismissed && (
          <div className="bg-smoke border border-amber/30 rounded-2xl p-4">
            <p className="font-mono text-bone text-sm mb-2">Install this app for faster daily check-ins</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await pwaPrompt.prompt();
                  setPwaPrompt(null);
                }}
                className="flex-1 bg-amber text-ash font-mono text-sm py-2.5 rounded-xl"
              >
                Install
              </button>
              <button
                onClick={() => setPwaDismissed(true)}
                className="px-4 py-2.5 rounded-xl border border-ember text-dim font-mono text-sm"
              >
                Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
