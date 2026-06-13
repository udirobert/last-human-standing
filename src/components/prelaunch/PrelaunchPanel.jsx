import { useEffect, useState } from "react";
import { useRound } from "../../world/RoundProvider.jsx";
import Countdown from "../Countdown.jsx";
import CohortProgress from "./CohortProgress.jsx";
import SharePanel from "./SharePanel.jsx";
import TopReferrersBoard from "./TopReferrersBoard.jsx";
import DailyPrompt from "./DailyPrompt.jsx";
import PrizePots from "./PrizePots.jsx";
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
      <CountdownCard launchAt={launchAt} split={split} />

      <PrizePots prizePool={prizePool} />

      {friendsInCohort != null && friendsInCohort > 0 && (
        <div className="bg-smoke/60 border border-neon/30 rounded-2xl px-4 py-3">
          <p className="font-mono text-neon text-sm">
            🎉 {friendsInCohort} of your invites {friendsInCohort === 1 ? "is" : "are"} in the cohort
          </p>
          <p className="text-dim text-xs font-mono mt-1">
            Top referrers get priority check-in on Day 1.
          </p>
        </div>
      )}

      {friendsInCohort === 0 && referralCount > 0 && (
        <div className="bg-smoke/60 border border-ember/40 rounded-2xl px-4 py-3">
          <p className="font-mono text-bone text-sm">
            Your invite is out there — share to your group chat
          </p>
          <p className="text-dim text-xs font-mono mt-1">
            Friends who join via your link jump the waitlist.
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
    <div className="bg-smoke border border-amber/40 rounded-3xl p-6 relative overflow-hidden">
      <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Day 1 in</p>
      {launchAt
        ? <Countdown targetIso={launchAt} className="font-display text-5xl text-bone leading-none animate-glow" />
        : <p className="font-display text-3xl text-dim">TBA</p>}

      {/* Two-bar cohort: paid + free. Replaces the single "5 of 50" bar. */}
      <div className="mt-5 space-y-3">
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
        <p className="text-dim text-[10px] font-mono leading-relaxed">
          {split.paidCount + split.freeCount} of {split.size} humans · 25 paid + 25 lottery
        </p>
      </div>
    </div>
  );
}

function PotsRow({ prizePool }) {
  // Replaced by <PrizePots /> — the shared component lives in
  // prelaunch/PrizePots.jsx and is used by both PrelaunchPanel
  // and Onboarding step 0 so the pot display is consistent.
  return <PrizePots prizePool={prizePool} />;
}
