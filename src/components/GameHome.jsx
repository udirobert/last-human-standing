import { useRef } from 'react';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import { useTrustTier } from '../hooks/useTrustTier.js';
import TrustBadge from './TrustBadge.jsx';
import TrustTierBanner from './TrustTierBanner.jsx';
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
import { DEFAULT_MASCOT_NAME } from '../hooks/usePersonalization.jsx';

/**
 * GameHome — persistent Survive view.
 * First viewport: brand + phase + primary job (mission / prelaunch CTA).
 * Badges, arsenal, waitlist live below the fold.
 */
export default function GameHome({ onCheckIn, onViewFeed, onViewHistory, onRouteToOnboarding, onRefresh }) {
  const { user, hasQueuedCheckin, clearQueuedCheckin, entryPaid, isWorldApp } = useWorld();
  const {
    phase, launchAt, currentDay,
    cohortSize, reservedCount, cohortFull,
    cohort: cohortSplit,
    usesDemoState, refresh: refreshRound,
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

  return (
    <AppShell phase={phase}>
      <DayRecap />
      {isLive && <RuleReveal onAudit={onViewFeed} />}
      {isLive && <DayBriefing />}

      <NetworkPill onRetry={onRefresh || refreshRound} error={usesDemoState} />

      {/* Hero — brand first; chrome lives in-flow so Rules/? never cover anon */}
      <div className="relative z-10 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isLive ? 'bg-neon' : 'bg-amber'}`} />
            <span className={`font-mono text-[10px] tracking-[0.18em] uppercase truncate ${isLive ? 'text-neon' : 'text-amber'}`}>
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
        {/* Personal return job — theme + one CTA before the rest of home */}
        {(isPrelaunch || isLive) && isReserved && (
          <StageSection index={0} className="relative z-10">
            <ReturnJobCard onCheckIn={onCheckIn} onViewFeed={onViewFeed} />
            {isLive && <TomorrowPostcard onViewFeed={onViewFeed} />}
          </StageSection>
        )}

        {(isLive || isEnded) && isReserved && tier !== 'verified' && (
          <StageSection index={0} className="relative z-10 px-5 mb-3">
            <TrustTierBanner onVerify={() => verifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
          </StageSection>
        )}

        {/* Live field theater — one pulse for the whole Survive home */}
        {isLive && (
          <StageSection index={0} className="relative z-10 px-5 mb-3">
            <FieldPulse />
          </StageSection>
        )}

        {/* Warm personal artifacts — counterpoint to cold field / census */}
        {(isLive || isEnded) && isReserved && (
          <StageSection index={0} className="relative z-10">
            <PersonalShelf onViewHistory={onViewHistory} className="mx-5 mb-3" />
          </StageSection>
        )}

        {(isLive || isEnded) && (
          <StageSection index={0} className="relative z-10">
            <MissionBoard onCheckIn={onCheckIn} onViewFeed={onViewFeed} user={user} />
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
          <StageSection index={1} className="relative z-10">
            <div className="px-5 grid grid-cols-2 gap-3 mb-3">
              <div className="bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
                <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Survivors</p>
                {activePlayers === null ? (
                  <div className="h-7 w-14 rounded bg-ember/40 animate-shimmer mt-1" />
                ) : (
                  <p className="font-display text-2xl text-bone leading-none tabular-nums">
                    {activePlayers}
                  </p>
                )}
                <p className="text-[10px] font-mono text-dim mt-1 tabular-nums">{eliminated} eliminated</p>
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
                <p className="text-[10px] font-mono text-dim mt-1 tabular-nums">
                  {cohortSplit?.paidCount ?? 0} paid · {cohortSplit?.freeCount ?? 0} free
                </p>
              </div>
            </div>
          </StageSection>
        )}

        {(isLive || isEnded) && (
          <StageSection index={2} className="relative z-10">
            <ActivityFeed />
          </StageSection>
        )}

        {(isLive || isEnded) && (
          <StageSection index={3} className="relative z-10">
            <ArsenalCard />
          </StageSection>
        )}

        {(isLive || isEnded) && (
          <StageSection index={4} className="relative z-10 px-5 mb-4">
            <PrizePots prizePool={stats?.prizePool} />
          </StageSection>
        )}

        {isPrelaunch && (
          <StageSection index={0} className="relative z-10">
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

        {/* Below-fold chrome — badges & secondary status */}
        <StageSection index={isPrelaunch ? 2 : 5} className="relative z-10 px-5 mb-4">
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <TrustBadge />
            <WhatsPublicChip />
            {isPrelaunch && <EarlyBadge size="sm" reservedAt={user?.reservedAt} />}
            <ModeBanner />
          </div>
          {isReserved && tier !== 'verified' && (
            <div ref={verifyRef} id="verify-section" className="mt-3">
              <VerifyOptIn defaultOpen={!isWorldApp} />
            </div>
          )}
        </StageSection>

        {isPrelaunch && (
          <StageSection index={3} className="relative z-10">
            <div className="px-5 grid grid-cols-2 gap-3 mb-4">
              <div className="bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
                <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Reserved</p>
                <p className="font-display text-2xl text-bone leading-none tabular-nums">
                  {reservedCount}<span className="text-dim text-sm"> / {cohortSize}</span>
                </p>
                <p className="text-[10px] font-mono text-dim mt-1 tabular-nums">
                  {cohortSplit?.paidCount ?? 0} paid · {cohortSplit?.freeCount ?? 0} free
                </p>
              </div>
              <div className="bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
                <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Status</p>
                <p className="font-display text-2xl text-amber leading-none">
                  {cohortFull ? "FULL" : "OPEN"}
                </p>
                <p className="text-[10px] font-mono text-dim mt-1">
                  {cohortFull ? "Join the waitlist" : "Slots available"}
                </p>
              </div>
            </div>
          </StageSection>
        )}

        {isLive && <WildcardPanel />}

        {isLive && (
          <div className="relative z-10 px-5 mb-3">
            <SpectatorChip user={user} onReserve={onRouteToOnboarding} />
          </div>
        )}

        {(isPrelaunch || isLive) && !user?.paid && (
          <StageSection index={6} className="relative z-10 px-5 mb-4">
            <WaitlistCard source={isLive ? 'spectator' : 'welcome_screen'} />
          </StageSection>
        )}
      </div>
    </AppShell>
  );
}
