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
import SpectatorChip from './SpectatorChip.jsx';
import { StageSection } from './StageShell.jsx';
import GlitchTitle from './ui/GlitchTitle.jsx';
import WaitlistCard from './WaitlistCard.jsx';

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
export default function GameHome({ onCheckIn, onViewFeed, onViewHistory, onRouteToOnboarding, onRefresh }) {
  const { user, hasQueuedCheckin, clearQueuedCheckin } = useWorld();
  const {
    phase, launchAt, currentDay,
    cohortSize, reservedCount, cohortFull,
    cohort: cohortSplit,
    usesDemoState, refresh: refreshRound,
  } = useRound();
  const { stats } = useStats();


  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;
  const eliminated = totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0;

  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';
  const isEnded = phase === 'ended';

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
              {isPrelaunch ? 'Pre-launch' : isLive ? `Live · Day ${currentDay ?? '—'}` : '🏆 Ended'}
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
        <GlitchTitle text="LAST HUMAN STANDING" className="font-display text-4xl text-bone tracking-wide animate-glow" />
      </div>

      {/* Live state: MissionBoard is the primary CTA. Prelaunch: PrelaunchPanel.
          Both render through the same StageSection pattern for consistent
          staggered reveal. */}
      {(isLive || isEnded) && (
        <StageSection index={0} className="relative z-10">
          <MissionBoard onCheckIn={onCheckIn} onViewFeed={onViewFeed} user={user} />
        </StageSection>
      )}

      {/* Spectator chip — only when the user is in the live phase
          but doesn't have a slot in the current cohort. The chip
          itself is responsible for the "is this me?" check. */}
      {isLive && (
        <div className="relative z-10 px-5 mb-3">
          <SpectatorChip
            user={user}
            onReserve={onRouteToOnboarding}
          />
        </div>
      )}

      {/* Queued check-in chip — visible after an offline submit so the
          user knows their submission will land when they reconnect. */}
      {hasQueuedCheckin && (
        <div className="relative z-10 px-5 mb-3">
          <div className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 flex items-center gap-2">
            <span className="text-amber text-sm">📡</span>
            <p className="text-amber font-mono text-xs flex-1">
              Check-in queued. Will submit when you reconnect.
            </p>
            <button
              onClick={clearQueuedCheckin}
              className="text-amber/70 font-mono text-[10px] underline decoration-dotted underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
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
            {activePlayers === null ? (
              <div className="h-7 w-14 rounded bg-ember/40 animate-shimmer mt-1" />
            ) : (
              <p className="font-display text-2xl text-bone leading-none tabular-nums">
                {activePlayers}
              </p>
            )}
            <p className="text-[10px] font-mono text-dim mt-1">{eliminated} eliminated</p>
          </div>
          <div className="bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Cohort 1</p>
            {totalPlayers === 0 && activePlayers === null ? (
              <div className="h-7 w-14 rounded bg-ember/40 animate-shimmer mt-1" />
            ) : (
              <p className="font-display text-2xl text-bone leading-none tabular-nums">
                {totalPlayers}<span className="text-dim text-sm"> / 50</span>
              </p>
            )}
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

      {/* Waitlist capture — visible during prelaunch so we don't
          lose bounced visitors. Sits below the pots so it doesn't
          fight the main CTAs. Also shown to spectators so anyone
          who can't join the current cohort has a clear next step. */}
      {(isPrelaunch || isLive) && !user?.paid && (
        <StageSection index={5} className="relative z-10 px-5 mb-4">
          <WaitlistCard source={isLive ? 'spectator' : 'welcome_screen'} />
        </StageSection>
      )}

    </div>
  );
}
