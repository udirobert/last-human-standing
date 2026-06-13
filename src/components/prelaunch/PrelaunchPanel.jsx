import { useEffect, useState } from "react";
import CountdownCard from "./CountdownCard.jsx";
import CohortProgress from "./CohortProgress.jsx";
import SharePanel from "./SharePanel.jsx";
import TopReferrersBoard from "./TopReferrersBoard.jsx";
import DailyPrompt from "./DailyPrompt.jsx";

/**
 * The single prelaunch surface. Composes all prelaunch widgets
 * into a consistent stack that follows the user across screens.
 *
 * Reads world/round state via props so it stays presentational and
 * easy to test.
 */
export default function PrelaunchPanel({
  launchAt,
  cohortSize,
  reservedCount,
  cohortFull,
  referralCode,
  referralCount,
  reservedAt,
  variant = "home", // "home" | "compact"
}) {
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
          cohortSize={cohortSize}
          reservedCount={reservedCount}
          cohortFull={cohortFull}
        />
      </div>
    );
  }

  return (
    <div className="px-5 space-y-3">
      <CountdownCard
        launchAt={launchAt}
        cohortSize={cohortSize}
        reservedCount={reservedCount}
        cohortFull={cohortFull}
      />

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
