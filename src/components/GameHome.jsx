import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import TrustBadge from './TrustBadge.jsx';
import EarlyBadge from './prelaunch/EarlyBadge.jsx';
import PrelaunchPanel from './prelaunch/PrelaunchPanel.jsx';
import PrizePots from './prelaunch/PrizePots.jsx';
import ModeBanner from './ModeBanner.jsx';
import MissionBoard from './MissionBoard.jsx';
import ActivityFeed from './ActivityFeed.jsx';
import NetworkPill from './ui/NetworkPill.jsx';
import FAQModal from './FAQModal.jsx';
import AmbientBackdrop from './AmbientBackdrop.jsx';
import { StageSection } from './StageShell.jsx';

/**
 * GameHome — the persistent home view. Two states:
 *   - prelaunch: full PrelaunchPanel (countdown, two-bar cohort,
 *     prize pots, daily prompt, share, ticker)
 *   - live: MissionBoard (day theme, check-in CTA) + ActivityFeed
 *
 * StageShell pattern applied:
 *   - phase-aware AmbientBackdrop behind everything
 *   - FAQ button in top-right (consistent with onboarding)
 *   - staggered StageSection reveals for every block
 *   - the inline "prize pool / survivors" stats card is replaced
 *     by the shared PrizePots component (so WLD + Celo are visible
 *     in the same place they appear in Onboarding)
 */
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

  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';

  return (
    <div className="relative min-h-screen bg-ash flex flex-col font-body pb-24 overflow-hidden">
      {/* Phase-aware ambient backdrop — same palette as Onboarding */}
      <AmbientBackdrop phase={phase} />

      {/* FAQ button in top-right — consistent with onboarding */}
      <div className="absolute top-4 right-4 z-20">
        <FAQModal />
      </div>

      <NetworkPill onRetry={onRefresh || refreshRound} error={usesDemoState} />

      <div className="relative z-10 px-5 pt-12 pb-4">
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

      {/* Live state: MissionBoard is the primary CTA. Prelaunch: PrelaunchPanel.
          Both render through the same StageSection pattern for consistent
          staggered reveal. */}
      {isLive && (
        <StageSection index={0} className="relative z-10">
          <MissionBoard onCheckIn={onCheckIn} onViewFeed={onViewFeed} />
        </StageSection>
      )}

      <StageSection index={1} className="relative z-10">
        <ActivityFeed />
      </StageSection>

      {isPrelaunch && (
        <StageSection index={2} className="relative z-10">
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
        </StageSection>
      )}

      {/* Stats row — PrizePots replaces the WLD-only inline card. Celo
          is now visible at the same level. Tap a pot to see the on-chain
          address and explorer link. */}
      <StageSection index={3} className="relative z-10">
        <div className="px-5 grid grid-cols-2 gap-3 mb-4">
          <div className="bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Survivors</p>
            <p className="font-display text-2xl text-bone leading-none tabular-nums">
              {activePlayers ?? '—'}
            </p>
            <p className="text-[10px] font-mono text-dim mt-1">{eliminated} eliminated</p>
          </div>
          <div className="bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Cohort 1</p>
            <p className="font-display text-2xl text-bone leading-none tabular-nums">
              {totalPlayers}<span className="text-dim text-sm"> / 50</span>
            </p>
            <p className="text-[10px] font-mono text-dim mt-1">
              {cohortSplit?.paidCount ?? 0} paid · {cohortSplit?.freeCount ?? 0} free
            </p>
          </div>
        </div>
      </StageSection>

      {/* Prize pots — tap to expand */}
      <StageSection index={4} className="relative z-10 px-5 mb-4">
        <PrizePots prizePool={stats?.prizePool} />
      </StageSection>

      <StageSection index={5} className="relative z-10">
        <div className="px-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={onViewFeed} className="bg-smoke/70 border border-ember/40 rounded-2xl py-4 text-bone font-mono text-sm backdrop-blur-sm hover:border-amber/60 active:scale-95 transition-all">
              Feed
            </button>
            <button onClick={onViewChat} className="bg-smoke/70 border border-ember/40 rounded-2xl py-4 text-bone font-mono text-sm backdrop-blur-sm hover:border-amber/60 active:scale-95 transition-all">
              Chat
            </button>
            <button onClick={onViewLeaderboard} className="bg-smoke/70 border border-ember/40 rounded-2xl py-4 text-bone font-mono text-sm backdrop-blur-sm hover:border-amber/60 active:scale-95 transition-all">
              Board
            </button>
          </div>

          {pwaPrompt && !pwaDismissed && (
            <div className="bg-smoke/70 border border-amber/30 rounded-2xl p-4 backdrop-blur-sm">
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
      </StageSection>
    </div>
  );
}
