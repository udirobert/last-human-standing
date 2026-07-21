/**
 * Derive a structured elimination reason for the "why did I lose?" UI.
 * Called from /api/game/state when the player is eliminated.
 */
export async function getEliminationReason(supabaseAdmin, address, eliminatedAtDay) {
  if (!supabaseAdmin || !address || !eliminatedAtDay) return null;

  const day = Number(eliminatedAtDay);
  if (!Number.isFinite(day) || day < 1) return null;

  const [{ data: checkin }, { data: submissions }, { data: round }] = await Promise.all([
    supabaseAdmin
      .from("checkins")
      .select("rank,survived,dq")
      .eq("day", day)
      .eq("address", address)
      .maybeSingle(),
    supabaseAdmin
      .from("submissions")
      .select("status,is_infiltrator")
      .eq("day", day)
      .eq("address", address)
      .order("created_at", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("rounds")
      .select("survival_cap,name")
      .eq("day", day)
      .maybeSingle(),
  ]);

  const submission = submissions?.[0] ?? null;
  const cap = round?.survival_cap ?? null;
  const rank = checkin?.rank ?? null;

  if (!checkin) {
    return {
      code: "no_checkin",
      day,
      cap,
      rank: null,
      theme: round?.name ?? null,
      wasInfiltrator: false,
    };
  }

  const flagged = Boolean(checkin.dq) || submission?.status === "flagged";
  if (flagged) {
    return {
      code: submission?.is_infiltrator ? "infiltrator_caught" : "audit_flagged",
      day,
      cap,
      rank,
      theme: round?.name ?? null,
      wasInfiltrator: Boolean(submission?.is_infiltrator),
    };
  }

  if (checkin.survived === false && rank != null && cap != null && rank > cap) {
    return {
      code: "too_slow",
      day,
      cap,
      rank,
      theme: round?.name ?? null,
      spotsAway: rank - cap,
      wasInfiltrator: false,
    };
  }

  if (checkin.survived === false) {
    return {
      code: "ranked_out",
      day,
      cap,
      rank,
      theme: round?.name ?? null,
      wasInfiltrator: false,
    };
  }

  return {
    code: "unknown",
    day,
    cap,
    rank,
    theme: round?.name ?? null,
    wasInfiltrator: Boolean(submission?.is_infiltrator),
  };
}
