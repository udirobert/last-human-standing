import { useMemo } from "react";
import { useWorld } from "../world/WorldProvider.jsx";
import { isProviderEnabled, HUMANITY_PROVIDERS } from "../config/humanityProviders.js";

/**
 * Trust tiers:
 * - verified: World ID or Self Protocol proof on file
 * - provisional: paid + authed, no PoH yet (browser wallet path)
 * - unverified: not paid or not authed
 */
export function useTrustTier() {
  const { walletAuthed, entryPaid, worldIdVerified, humanityProvider, isWorldApp, platform } = useWorld();

  return useMemo(() => {
    const requireWorldIdForVoting =
      import.meta.env.VITE_REQUIRE_WORLD_ID_FOR_VOTING === "true";
    const worldIdEnabled = isProviderEnabled(HUMANITY_PROVIDERS.world);

    // humanityProvider is sourced from useWorld (which reads /api/me).
    // It is "world", "self", or null. Don't shadow it with a local
    // const here — the previous shadow hid Self from the labels object.
    const humanityVerified = Boolean(worldIdVerified || humanityProvider);
    // Fall back to "world" if verified but no provider reported (legacy data)
    const reportedProvider = humanityProvider || (worldIdVerified ? "world" : null);

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
            ? "Verify with World ID or Self to vote — this stops sybil accounts."
            : "Humanity verification is required to vote."
          : null;

    return {
      tier,
      humanityVerified,
      humanityProvider: reportedProvider,
      canVote,
      voteBlockedReason,
      requireWorldIdForVoting,
      isWorldApp,
      platform,
      labels: {
        verified:
          reportedProvider === "self"
            ? "Verified · Self"
            : reportedProvider === "world"
              ? "Verified · World ID"
              : "Verified",
        provisional: "Provisional — verify World ID or Self for full trust",
        unverified: "Browsing — reserve a slot to play",
      },
    };
  }, [walletAuthed, entryPaid, worldIdVerified, humanityProvider, isWorldApp, platform]);
}
