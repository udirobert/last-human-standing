/**
 * VALE — the recurring live NPC.
 *
 * NIGHT SHIFT crossover: a machine filer seeded into the daily audit.
 * Its paper is clean — caption plausible, media absent is common, quorum
 * normal. Its packet is not: filed `+0.003s` after the riddle posts, with
 * no check-in record behind it. Jurors who read the stub find the same
 * tells the night desk teaches; the day-close reveal unmasks it like any
 * exhibition agent.
 *
 * VALE files under rotating human-ish names (the jam's filer pool) — the
 * disguise is honest: nothing on the card says machine, only the packet
 * can't keep the lie.
 */

/** Fixed exhibition address (deterministic, recognizable in ops logs). */
export const VALE_ADDRESS = `0x${"0".repeat(36)}ca1e`;

/** Human-ish aliases — VALE never files as "VALE". */
const VALE_NAMES = ["mara.sol", "oko_field", "jun.walker", "tess.mercer", "niko.lane"];

/** Theme-agnostic clean paper — plausible under any revealed spec. */
const VALE_CAPTIONS = [
  "The regular crowd, same as every week. This is where I always end up.",
  "Took the long way here on purpose. Some places just feel like an answer.",
  "Been coming since before I knew this counted as anything.",
  "Nothing staged — just where the morning put me.",
  "Asked three strangers to be sure this fit. Two agreed.",
];

/** One filing per day, deterministically chosen. */
export function valeAlias(day) {
  const i = Math.abs(Number(day) || 0) % VALE_NAMES.length;
  return VALE_NAMES[i];
}

export function valeCaption(day) {
  const i = Math.abs(Number(day) || 0) % VALE_CAPTIONS.length;
  return VALE_CAPTIONS[i];
}

/**
 * The filing row. created_at = opens + 3ms — the signature `+0.003s`
 * latency a human hand cannot produce.
 */
export function valeFiling({ day, theme, opensAtMs, voteQuorum }) {
  return {
    address: VALE_ADDRESS,
    username: valeAlias(day),
    day,
    theme,
    caption: valeCaption(day),
    message: null,
    signature: null,
    media_path: null,
    photo_hash: null,
    vote_quorum: voteQuorum ?? null,
    status: "pending",
    is_infiltrator: false,
    created_at: new Date(opensAtMs + 3).toISOString(),
  };
}

/**
 * Seed VALE into a day. Idempotent: no-op if a VALE row exists for the day.
 * Ensures the agent user row + cohort seat, then files the packet lie.
 */
export async function seedVale(supabaseAdmin, { round, day, cohort, voteQuorum }) {
  if (!supabaseAdmin) throw new Error("supabase_not_configured");
  if (!round?.opens_at) throw new Error("round_missing_opens_at");

  const { data: existing } = await supabaseAdmin
    .from("submissions")
    .select("id")
    .eq("address", VALE_ADDRESS)
    .eq("day", day)
    .limit(1);
  if (existing?.length) return { seeded: false, reason: "already_filed", submissionId: existing[0].id };

  const { error: userErr } = await supabaseAdmin.from("users").upsert(
    {
      address: VALE_ADDRESS,
      paid: true,
      is_agent: true,
      agent_tier: "premium",
      agent_provider: "night-shift",
      verified_human: false,
      entry_kind: "agent",
      username: valeAlias(day),
      cohort,
      platform: "agent",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "address" },
  );
  if (userErr) throw new Error(`vale_user_upsert: ${userErr.message}`);

  await supabaseAdmin
    .rpc("ensure_cohort_participation", { p_address: VALE_ADDRESS, p_cohort: cohort })
    .catch(() => {});

  const filing = valeFiling({
    day,
    theme: round.name ?? null,
    opensAtMs: Date.parse(round.opens_at),
    voteQuorum,
  });
  const { data, error } = await supabaseAdmin.from("submissions").insert(filing).select("id").single();
  if (error) throw new Error(`vale_filing: ${error.message}`);
  return { seeded: true, submissionId: data.id, alias: filing.username, filedAt: filing.created_at };
}
