import { useMemo } from "react";
import { useWorld } from "../world/WorldProvider.jsx";
import { isProviderEnabled, HUMANITY_PROVIDERS } from "../config/humanityProviders.js";

/**
 * Trust tiers:
 * - verified: World ID (or future Self) proof on file
 * - provisional: paid + authed, no PoH yet (browser wallet path)
 * - unverified: not paid or not authed
 */
export function useTrustTier() {
  const { walletAuthed, entryPaid, worldIdVerified, isWorldApp, platform } = useWorld();

  return useMemo(() => {
    const requireWorldIdForVoting =
      import.meta.env.VITE_REQUIRE_WORLD_ID_FOR_VOTING === "true";
    const worldIdEnabled = isProviderEnabled(HUMANITY_PROVIDERS.world);

    const humanityVerified = Boolean(worldIdVerified);
    const humanityProvider = humanityVerified ? "world" : null;

    let tier = "unverified";
    if (walletAuthed && entryPaid && humanityVerified) tier = "verified";
    else if (walletAuthed && entryPaid) tier = "provisional";

    const canVote =
      walletAuthed &&
      entryPaid &&
      (!requireWorldIdForVoting || humanityVerified);

    const voteBlockedReason =
      !walletAuthed || !entryPaid
        ? "Reserve your slot and sign in to vote."
        : requireWorldIdForVoting && !humanityVerified
          ? worldIdEnabled
            ? "Verify with World ID to vote — this stops sybil accounts."
            : "Humanity verification is required to vote."
          : null;

    return {
      tier,
      humanityVerified,
      humanityProvider,
      canVote,
      voteBlockedReason,
      requireWorldIdForVoting,
      isWorldApp,
      platform,
      labels: {
        verified: "Verified human",
        provisional: "Provisional — verify to unlock full trust",
        unverified: "Not enrolled",
      },
    };
  }, [walletAuthed, entryPaid, worldIdVerified, isWorldApp, platform]);
}
