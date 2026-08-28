/**
 * Human-readable copy for elimination reasons returned by /api/game/state.
 */

const COPY = {
  no_checkin: {
    title: "No check-in",
    body: (r) =>
      `You didn't check in on Day ${r.day}. Missing a day ends your run — the window doesn't wait.`,
    hint: "Set a reminder for the next cohort. The window is 18 hours — plenty, if you use it.",
  },
  not_drawn: {
    title: "Not drawn",
    body: (r) =>
      `Day ${r.day} closed with ${r.eligible ?? "more"} eligible players for ${r.cap ?? "?"} slots. The seed lottery decided — your number wasn't called.`,
    hint: "Your check-in was valid; the field just overflowed. The draw is public and replayable from the cohort seed.",
  },
  too_slow: {
    title: "Didn't make the cut",
    body: (r) =>
      r.spotsAway != null && r.spotsAway > 0
        ? `Rank #${r.rank} — ${r.spotsAway} ${r.spotsAway === 1 ? "spot" : "spots"} outside the cap of ${r.cap}.`
        : `Rank #${r.rank ?? "—"} didn't make the first-${r.cap ?? "?"} cut.`,
    hint: "This day fell back to check-in order. Normally the seed lottery decides — not speed.",
  },
  ranked_out: {
    title: "Didn't make the cut",
    body: (r) => `Day ${r.day} closed with you outside the survival cap${r.cap != null ? ` (${r.cap} spots)` : ""}.`,
    hint: "The audit can still DQ flagged survivors — but you have to check in within the window first.",
  },
  audit_flagged: {
    title: "Flagged by the crowd",
    body: () => "The audit voted SUS on your photo. Flagged survivors lose their slot.",
    hint: "Authentic photos with landmarks or optional GPS tend to read as more credible.",
  },
  infiltrator_caught: {
    title: "Infiltrator caught",
    body: () => "You bluffed — the crowd called it. Infiltrator immunity burned.",
    hint: "Infiltrator mode is high risk, high reward. Only opt in when you mean it.",
  },
  unknown: {
    title: "Eliminated",
    body: (r) => `Day ${r.day} closed. You're on the jury now.`,
    hint: "Your votes still shape who survives — accuracy earns ×2 weight.",
  },
};

export function formatEliminationReason(reason) {
  if (!reason?.code) return null;
  const entry = COPY[reason.code] ?? COPY.unknown;
  return {
    code: reason.code,
    title: entry.title,
    body: entry.body(reason),
    hint: entry.hint,
    day: reason.day ?? null,
    rank: reason.rank ?? null,
    cap: reason.cap ?? null,
    spotsAway: reason.spotsAway ?? null,
    eligible: reason.eligible ?? null,
    theme: reason.theme ?? null,
    wasInfiltrator: Boolean(reason.wasInfiltrator),
  };
}
