import { useEffect, useState, useMemo } from "react";
import { useRound } from "../../world/RoundProvider.jsx";
import Countdown from "../Countdown.jsx";
import CohortProgress from "./CohortProgress.jsx";
import SharePanel from "./SharePanel.jsx";
import TopReferrersBoard from "./TopReferrersBoard.jsx";
import DailyPrompt from "./DailyPrompt.jsx";
import PrizePots from "./PrizePots.jsx";
import PostReserveExtras from "./PostReserveExtras.jsx";
import MascotGuide from "../ui/MascotGuide.jsx";
import MotifFrieze from "../ui/MotifFrieze.jsx";
import { HumanCta } from "../ui/CraftCta.jsx";
import CoffeeBrew from "../ui/CoffeeBrew.jsx";
import { COHORT } from "../../lib/copy.js";
import { COHORT_SCHEDULE } from "../../data/game";
import OnboardingTutorial from "../OnboardingTutorial.jsx";

/**
 * The single prelaunch surface. Composes all prelaunch widgets
 * into a consistent stack that follows the user across screens.
 *
 * Reads world/round state via props so it stays presentational and
 * easy to test.
 */
export default function PrelaunchPanel({
  cohort,        // {size, paidSlots, freeSlots, paidCount, freeCount}
  prizePool,     // {wld:{address,balance,explorerUrl}, celo:{address,celo,cusd,usdc,stable,explorerUrl}}
  launchAt,
  referralCode,
  referralCount,
  reservedAt,
  isReserved = false,
  onReserve,
  phase = "prelaunch",
  variant = "home",
}) {
  const round = useRound();
  // Fallback to round.cohort for clients that haven't refreshed yet.
  const split = cohort ?? round.cohort ?? {
    size: COHORT.size,
    paidSlots: COHORT.paidSlots,
    freeSlots: COHORT.freeSlots,
    paidCount: 0,
    freeCount: 0,
  };

  // "X of your friends joined" social proof. The /api/cohort/roster
  // endpoint already exposes the roster; we filter to invites of the
  // current user. Best-effort: if it fails, we silently skip the chip.
  const [friendsInCohort, setFriendsInCohort] = useState(null);
  useEffect(() => {
    if (!referralCode || referralCount === 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/cohort/roster", { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        const count = (data?.roster ?? []).filter(
          (u) => u.referred_by === referralCode,
        ).length;
        if (!cancelled) setFriendsInCohort(count);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [referralCode, referralCount]);

  if (variant === "compact") {
    return (
      <div className="w-full space-y-3">
        <CountdownCard
          launchAt={launchAt}
          split={split}
        />
      </div>
    );
  }

  return (
    <div className="px-5 space-y-3">
      {!isReserved && variant === "home" && (
        <div className="border border-ember/40 rounded-3xl p-4 bg-smoke/50 backdrop-blur-sm">
          <MascotGuide
            variant="thinking"
            size={52}
            message="A 5-day real-world check-in game. One human wins the pot."
            position="top"
            className="mb-3"
          />
          {onReserve && (
            <HumanCta onClick={onReserve} className="w-full">
              Reserve your slot →
            </HumanCta>
          )}
        </div>
      )}

      {!isReserved && variant === "home" && (
        <OnboardingTutorial />
      )}

      {isReserved && (
        <PostReserveExtras reservedAt={reservedAt} phase={phase} />
      )}

      {isReserved && <GetReadyCard />}

      <CountdownCard launchAt={launchAt} split={split} />

      <LotteryStatus launchAt={launchAt} />

      <PrizePots prizePool={prizePool} />

      {friendsInCohort != null && friendsInCohort > 0 && (
        <div className="bg-smoke/60 border border-neon/30 rounded-2xl px-4 py-3">
          <p className="font-body text-neon text-sm">
            {friendsInCohort} {friendsInCohort === 1 ? "friend is" : "friends are"} in with you
          </p>
        </div>
      )}

      {friendsInCohort === 0 && referralCount > 0 && (
        <div className="bg-smoke/60 border border-ember/40 rounded-2xl px-4 py-3">
          <p className="font-body text-bone/80 text-sm">
            Your invite is out — share it to your group chat
          </p>
        </div>
      )}

      <DailyPrompt />

      <SharePanel
        referralCode={referralCode}
        referralCount={referralCount}
      />

      <TopReferrersBoard />
    </div>
  );
}

function GetReadyCard() {
  const day1 = COHORT_SCHEDULE[0];
  const day3 = COHORT_SCHEDULE[2];
  const { you, reservedCount } = useRound();

  // Cycle through mystery emojis to keep users guessing
  const [day1Emoji, setDay1Emoji] = useState(() => {
    const emojis = ["❓", "🔮", "🎲", "🎯", "✨", "🌟"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  });
  
  const [day3Emoji, setDay3Emoji] = useState(() => {
    const emojis = ["🔮", "❓", "🎲", "🎯", "✨", "🌟"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  });

  useEffect(() => {
    const emojis = ["❓", "🔮", "🎲", "🎯", "✨", "🌟"];
    const interval1 = setInterval(() => {
      setDay1Emoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 3000 + Math.random() * 2000);
    
    const interval2 = setInterval(() => {
      setDay3Emoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 3000 + Math.random() * 2000);
    
    return () => {
      clearInterval(interval1);
      clearInterval(interval2);
    };
  }, []);

  // Social proof: show referral count if user has referred friends
  const referralCount = you?.referralCount ?? 0;
  const friendsInCohort = referralCount > 0 ? `${referralCount} friend${referralCount !== 1 ? 's' : ''} joined through your invite` : null;

  return (
    <div className="border border-neon/30 rounded-3xl p-5 bg-smoke/60 backdrop-blur-sm">
      <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-3 text-center">
        Get ready
      </p>
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 bg-smoke/70 border border-ember/40 rounded-2xl p-3">
          <span className="text-2xl shrink-0 transition-all duration-300">{day1Emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-bone text-sm leading-tight">
              Day 1: ???
            </p>
            <p className="text-dim text-[10px] font-mono mt-0.5">
              {day1.dayLabel} · 50 → {day1.cap} survivors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-smoke/70 border border-ember/40 rounded-2xl p-3">
          <span className="text-2xl shrink-0 transition-all duration-300">{day3Emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-bone text-sm leading-tight">
              Day 3: ???
            </p>
            <p className="text-dim text-[10px] font-mono mt-0.5">
              {day3.dayLabel} · line up a real human
            </p>
          </div>
        </div>
      </div>
      
      {/* Social proof: cohort status */}
      <div className="mt-4 pt-3 border-t border-ember/30">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-dim">Cohort</span>
          <span className="text-bone">{reservedCount}/50 reserved</span>
        </div>
        <div className="mt-2 h-1.5 bg-smoke/40 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber to-neon transition-all duration-500"
            style={{ width: `${Math.min(100, (reservedCount / 50) * 100)}%` }}
          />
        </div>
        {friendsInCohort && (
          <p className="text-neon text-[10px] font-mono mt-2 text-center">
            ✓ {friendsInCohort}
          </p>
        )}
      </div>
    </div>
  );
}

function LotteryStatus({ launchAt }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const r = await fetch("/api/lottery/status");
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setStatus(data);
      } catch { /* ignore */ }
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, []);

  if (!status) return null;

  const { minCandidates, maxDelayHours, freeRegistered } = status;
  const hasEnough = freeRegistered >= minCandidates;

  return (
    <div className="border border-amber/30 rounded-3xl p-4 bg-smoke/50 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">🎲</div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-bone text-sm leading-tight mb-1">
            Free lottery mechanics
          </p>
          <p className="text-dim text-[10px] font-body leading-relaxed">
            {hasEnough ? (
              <>
                <span className="text-neon">✓ {freeRegistered} free users registered</span>
                <span className="mx-1">·</span>
                draw fires at launch (or when {minCandidates} sign up)
              </>
            ) : (
              <>
                Draw fires when <span className="text-amber">{minCandidates} free users</span> sign up
                <span className="mx-1">·</span>
                or {maxDelayHours}h after launch (whichever first)
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function CountdownCard({ launchAt, split }) {
  // T-minus rotating copy — cycles through schedule-themed hints every 5s
  // so the countdown feels concrete instead of abstract.
  const tMinusLines = useMemo(() => [
    `tomorrow · find your proof ☕`,
    `day 3 · prove you know someone 🤝`,
    `day 4 · hunt for the hidden 📚`,
    `day 5 · rise before the sun 🌅`,
    `50 humans · 5 days · 1 winner`,
    `the crowd votes · stay honest`,
  ], []);

  const [lineIdx, setLineIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setLineIdx((i) => (i + 1) % tMinusLines.length);
    }, 5000);
    return () => clearInterval(id);
  }, [tMinusLines.length]);

  return (
    <div
      className="border border-amber/35 rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: "radial-gradient(120% 100% at 50% 0%, #3a281c 0%, #1c1410 70%, #14100e 100%)",
      }}
    >
      <div className="absolute right-3 top-3 opacity-30 pointer-events-none" aria-hidden>
        <CoffeeBrew size={64} />
      </div>
      <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1 relative">Day 1 in</p>
      {launchAt
        ? <Countdown targetIso={launchAt} className="font-display text-5xl text-bone leading-none animate-glow relative" />
        : <p className="font-display text-3xl text-dim relative">TBA</p>}
      <p className="font-display text-bone text-lg tracking-wide mt-3 relative">
        <span className="text-amber">???</span>
        <span className="text-dim mx-2">·</span>
        <span className="text-bone/80">50 → 25</span>
      </p>
      <p className="font-mono text-dim text-[10px] tracking-widest uppercase mt-1 relative">
        snap your proof from anywhere on Earth
      </p>

      <div className="mt-5 space-y-3 relative">
        <CohortProgress
          label="Paid · guaranteed"
          count={split.paidCount}
          total={split.paidSlots}
          tone="amber"
        />
        <CohortProgress
          label="Free · lottery"
          count={split.freeCount}
          total={split.freeSlots}
          tone="neon"
        />
        <p className="text-dim text-[10px] font-mono">
          {(split.paidCount + split.freeCount) > 0
            ? `${split.paidCount + split.freeCount} of ${split.size} reserved`
            : `be the first`}
        </p>
      </div>

      <MotifFrieze className="w-full mt-5 opacity-90" />
      <p
        className="font-mono text-amber/80 uppercase text-center mt-2 transition-opacity duration-500"
        style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 1 }}
        key={lineIdx}
      >
        {tMinusLines[lineIdx]}
      </p>
    </div>
  );
}

function PotsRow({ prizePool }) {
  // Replaced by <PrizePots /> — the shared component lives in
  // prelaunch/PrizePots.jsx and is used by both PrelaunchPanel
  // and Onboarding step 0 so the pot display is consistent.
  return <PrizePots prizePool={prizePool} />;
}
