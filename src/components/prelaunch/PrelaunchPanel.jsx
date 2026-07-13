import { useEffect, useState } from "react";
import { useRound } from "../../world/RoundProvider.jsx";
import Countdown from "../Countdown.jsx";
import CohortProgress from "./CohortProgress.jsx";
import SharePanel from "./SharePanel.jsx";
import TopReferrersBoard from "./TopReferrersBoard.jsx";
import DailyPrompt from "./DailyPrompt.jsx";
import PrizePots from "./PrizePots.jsx";
import PostReserveExtras from "./PostReserveExtras.jsx";
import MotifFrieze from "../ui/MotifFrieze.jsx";
import CoffeeBrew from "../ui/CoffeeBrew.jsx";
import { COHORT } from "../../lib/copy.js";

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
      {isReserved && (
        <PostReserveExtras reservedAt={reservedAt} phase={phase} />
      )}

      <CountdownCard launchAt={launchAt} split={split} />

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

function CountdownCard({ launchAt, split }) {
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
      <p className="font-mono text-dim uppercase text-center mt-2" style={{ fontSize: 10, letterSpacing: "0.14em" }}>
        the little proofs you&apos;re human
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
