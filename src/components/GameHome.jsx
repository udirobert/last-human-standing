import { useEffect, useRef } from 'react';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { track } from '../lib/track.js';
import { useStats } from '../hooks/useStats.js';
import { useTrustTier } from '../hooks/useTrustTier.js';
import TrustBadge from './TrustBadge.jsx';
import CohortSummaryBar from './ui/CohortSummaryBar.jsx';
import SurvivorDossier from './ui/SurvivorDossier.jsx';
import DayBriefing from './DayBriefing.jsx';
import RulesDrawer from './RulesDrawer.jsx';
import VerifyOptIn from './prelaunch/VerifyOptIn.jsx';
import WhatsPublicChip from './WhatsPublicChip.jsx';
import EarlyBadge from './prelaunch/EarlyBadge.jsx';
import PrelaunchPanel from './prelaunch/PrelaunchPanel.jsx';
import PrizePots from './prelaunch/PrizePots.jsx';
import ModeBanner from './ModeBanner.jsx';
import MissionBoard from './MissionBoard.jsx';
import WildcardPanel from './WildcardPanel.jsx';
import ActivityFeed from './ActivityFeed.jsx';
import NetworkPill from './ui/NetworkPill.jsx';
import FAQModal from './FAQModal.jsx';
import AppShell, { SHELL_BOTTOM_PAD } from './AppShell.jsx';
import SpectatorChip from './SpectatorChip.jsx';
import { StageSection } from './StageShell.jsx';
import GlitchTitle from './ui/GlitchTitle.jsx';
import WaitlistCard from './WaitlistCard.jsx';
import ArsenalCard from './ArsenalCard.jsx';
import DayRecap from './DayRecap.jsx';
import RuleReveal from './RuleReveal.jsx';
import SpecReveal from './ui/SpecReveal.jsx';
import Mascot from './Mascot.jsx';
import DayZeroBanner from './DayZeroBanner.jsx';
import ThemeReveal from './ThemeReveal.jsx';
import ReturnJobCard from './ReturnJobCard.jsx';
import TomorrowPostcard from './TomorrowPostcard.jsx';
import FieldPulse from './FieldPulse.jsx';
import PersonalShelf from './PersonalShelf.jsx';
import { useDelight } from './DelightProvider.jsx';
import { HeaderSoundButton } from './MusicDock.jsx';
import { useMascotEvent } from '../hooks/useMascotEvent.js';
import ThemeMotif from './ui/ThemeMotif.jsx';
import { DEFAULT_MASCOT_NAME } from '../__experimental__/usePersonalization.jsx';

/**
 * GameHome — persistent Survive view.
 * First viewport: brand + phase + primary job (mission / prelaunch CTA).
 * Badges, arsenal, waitlist live below the fold.
 */
export default function GameHome({ onCheckIn, onViewFeed, onViewHistory, onRouteToOnboarding, onRefresh, onViewStandings }) {
  const { user, hasQueuedCheckin, clearQueuedCheckin, entryPaid, isWorldApp } = useWorld();
  const {
    phase, launchAt, currentDay,
    cohortSize, reservedCount, cohortFull,
    cohort: cohortSplit,
    usesDemoState, refresh: refreshRound,
    pilot,
  } = useRound();
  const { stats } = useStats();
  const { tier } = useTrustTier();
  const verifyRef = useRef(null);
  const { mascotName, showNameModal, handleMascotClick } = useDelight();
  const { mascotEvent } = useMascotEvent();

  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;
  const eliminated = totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0;

  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';
  const isEnded = phase === 'ended';
  const isReserved = Boolean(entryPaid || user?.paid);
  const revivalEnabled = Boolean(pilot?.revivalEnabled);

  // Funnel: returned_next_day — a returning visit on a later day than the
  // player last saw. Drives the "weak return motivation" measurement.
  useEffect(() => {
    if (!isLive || currentDay == null) return;
    try {
      const last = localStorage.getItem('lhs_last_seen_day');
      const day = Number(currentDay);
      if (last != null && Number.isFinite(Number(last)) && Number(last) >= 1 && day > Number(last)) {
        track('returned_next_day', { day });
      }
      localStorage.setItem('lhs_last_seen_day', String(day));
    } catch {
      /* ignore */
    }
  }, [isLive, currentDay]);

  return (
    <AppShell phase={phase}>
      <DayRecap />
      {isLive && <RuleReveal onAudit={onViewFeed} />}
      {isLive && <SpecReveal onAudit={onViewFeed} />}
      {isLive && <DayBriefing />}

      <NetworkPill onRetry={onRefresh || refreshRound} error={usesDemoState} />

      {/* Hero — brand first; chrome lives in-flow so Rules/? never cover anon */}
      <div className="relative z-10 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isLive ? 'bg-neon' : 'bg-amber'}`} />
            <span className={`font-mono text-[11px] tracking-[0.18em] uppercase truncate ${isLive ? 'text-neon' : 'text-amber'}`}>
              {isPrelaunch ? 'Pre-launch' : isLive ? `Live · Day ${currentDay ?? '—'}` : 'Ended'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <HeaderSoundButton />
            <RulesDrawer />
            <FAQModal />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <GlitchTitle text="LAST HUMAN STANDING" className="font-display text-[2.65rem] leading-none text-bone tracking-wide animate-glow" />
            <p className="mt-2 font-body text-bone/55 text-sm max-w-[20rem] leading-snug">
              {isPrelaunch
                ? (isReserved ? 'Your seat is saved. Hold the line until Day 1.' : 'Reserve a seat. Show up every day. Last human wins.')
                : isLive
                  ? 'Check in. Vote. Stay human.'
                  : 'The cohort has closed. The record remains.'}
            </p>
            <button
              type="button"
              onClick={onViewHistory}
              className="mt-2 font-mono text-dim text-[11px] hover:text-bone transition-colors underline decoration-dotted underline-offset-2"
            >
              {user?.displayName ?? 'anon'}
            </button>
          </div>
          <div className="shrink-0 flex flex-col items-center">
            <Mascot
              variant={mascotEvent?.variant || (isLive ? "determined" : isEnded ? "proud" : "thinking")}
              size={56}
              name={mascotName || DEFAULT_MASCOT_NAME}
              interactive
              trackCursor={false}
              onClick={handleMascotClick}
            />
            <button
              type="button"
              onClick={showNameModal}
              className="mt-1 font-mono text-[9px] text-dim hover:text-amber transition-colors underline decoration-dotted underline-offset-2"
            >
              rename
            </button>
          </div>
        </div>
      </div>

      <DayZeroBanner />
      <ThemeReveal />

      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain ${SHELL_BOTTOM_PAD}`}>
        {/* 1. Primary mission surface */}
        {(isLive || isEnded) && (
          <StageSection index={1} className="relative z-10">
            <MissionBoard onCheckIn={onCheckIn} onViewFeed={onViewFeed} user={user} />
          </StageSection>
        )}

        {/* 2. Cohort Status Bridge — replaces redundant 2-col census & prize pot cards */}
        <StageSection index={2} className="relative z-10">
          <CohortSummaryBar
            activePlayers={activePlayers}
            totalPlayers={totalPlayers}
            cohortSize={cohortSize}
            prizePoolWld={stats?.prizePool?.balanceWld}
            isLive={isLive}
            isPrelaunch={isPrelaunch}
            onViewStandings={onViewStandings}
          />
        </StageSection>

        {isLive && isReserved && (
          <StageSection index={3} className="relative z-10">
            <TomorrowPostcard onViewFeed={onViewFeed} />
          </StageSection>
        )}

        {/* 4. Live field pulse */}
        {isLive && (
          <StageSection index={4} className="relative z-10 px-5 mb-3">
            <FieldPulse />
          </StageSection>
        )}

        {/* 5. Warm personal shelf — proof thumb, streak, tickets */}
        {(isLive || isEnded) && isReserved && (
          <StageSection index={5} className="relative z-10">
            <PersonalShelf onViewHistory={onViewHistory} className="mx-5 mb-3" />
          </StageSection>
        )}

        {hasQueuedCheckin && (
          <div className="relative z-10 px-5 mb-3">
            <div className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 flex items-center gap-2">
              <ThemeMotif emoji="📡" size={28} label="queued" className="shrink-0" />
              <p className="text-amber font-mono text-xs flex-1">
                Check-in queued. Will submit when you reconnect.
              </p>
              <button
                type="button"
                onClick={clearQueuedCheckin}
                className="text-amber/70 font-mono text-[10px] underline decoration-dotted underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {(isLive || isEnded) && (
          <StageSection index={6} className="relative z-10">
            <ActivityFeed />
          </StageSection>
        )}

        {/* 7. Progressive Disclosure Dossier: Badges, Trust, Arsenal & Verification */}
        <StageSection index={7} className="relative z-10">
          <SurvivorDossier
            isReserved={isReserved}
            isPrelaunch={isPrelaunch}
            user={user}
            verifyRef={verifyRef}
          />
        </StageSection>

        {isPrelaunch && (
          <StageSection index={8} className="relative z-10">
            <PrelaunchPanel
              launchAt={launchAt}
              phase={phase}
              isReserved={isReserved}
              onReserve={onRouteToOnboarding}
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

        {/* Wildcard revival — only mounted when the server enables it (pilot off) */}
        {isLive && revivalEnabled && <WildcardPanel />}

        {isLive && (
          <div className="relative z-10 px-5 mb-3">
            <SpectatorChip user={user} onReserve={onRouteToOnboarding} />
          </div>
        )}

        {(isPrelaunch || isLive) && !user?.paid && (
          <StageSection index={9} className="relative z-10 px-5 mb-4">
            <WaitlistCard source={isLive ? 'spectator' : 'welcome_screen'} />
          </StageSection>
        )}
      </div>
    </AppShell>
  );
}
