import { commitmentFor } from "../../src/lib/commitRevealVote.js";

export function isCommitRevealEnabled(env = process.env) {
  return env.COMMIT_REVEAL_VOTING_ENABLED === "true";
}

export function commitRevealConfig(env = process.env) {
  return {
    enabled: isCommitRevealEnabled(env),
    registry: env.COMMIT_REVEAL_REGISTRY_ADDRESS || null,
    chainId: Number(env.COMMIT_REVEAL_CHAIN_ID || env.VITE_CELO_CHAIN_ID || 42220),
  };
}

// Convenience bindings used by routes (evaluated at call time via helpers above).
export const COMMIT_REVEAL_VOTING_ENABLED = process.env.COMMIT_REVEAL_VOTING_ENABLED === "true";
export const COMMIT_REVEAL_REGISTRY_ADDRESS = process.env.COMMIT_REVEAL_REGISTRY_ADDRESS || null;
export const COMMIT_REVEAL_CHAIN_ID = Number(
  process.env.COMMIT_REVEAL_CHAIN_ID || process.env.VITE_CELO_CHAIN_ID || 42220,
);

/**
 * Resolve public commit–reveal state for game/state + Feed.
 * When the flag is off, returns { enabled: false }.
 */
export function buildCommitRevealState(round, { now = Date.now(), env = process.env } = {}) {
  const cfg = commitRevealConfig(env);
  if (!cfg.enabled) {
    return { enabled: false };
  }

  const commitDeadlineIso = round?.commit_deadline || round?.closes_at || null;
  const revealDeadlineIso = round?.reveal_deadline || null;
  const commitMs = commitDeadlineIso ? Date.parse(commitDeadlineIso) : NaN;
  const revealMs = revealDeadlineIso ? Date.parse(revealDeadlineIso) : NaN;

  let phase = "unavailable";
  if (Number.isFinite(commitMs) && now < commitMs) phase = "commit";
  else if (Number.isFinite(commitMs) && Number.isFinite(revealMs) && now >= commitMs && now < revealMs) {
    phase = "reveal";
  } else if (Number.isFinite(commitMs) && !Number.isFinite(revealMs) && now >= commitMs) {
    // Flag on but reveal_deadline missing — allow reveal until further notice.
    phase = "reveal";
  } else if (Number.isFinite(revealMs) && now >= revealMs) {
    phase = "closed";
  }

  return {
    enabled: true,
    registry: cfg.registry,
    chainId: cfg.chainId,
    phase,
    commitDeadline: commitDeadlineIso,
    revealDeadline: revealDeadlineIso,
  };
}

export function verifyClientCommitment({
  registry,
  chainId,
  roundId,
  submissionId,
  voter,
  vote,
  salt,
  commitment,
}) {
  const expected = commitmentFor({
    registry,
    chainId,
    roundId,
    submissionId,
    voter,
    vote,
    salt,
  });
  return {
    ok: expected.toLowerCase() === String(commitment || "").toLowerCase(),
    expected,
  };
}

export async function enqueueCommitRevealJob(db, {
  jobType,
  submissionId,
  voterAddress,
  vote,
  roundId,
  commitment = null,
  salt = null,
}) {
  if (!db) return;
  const { error } = await db.from("vote_queue").insert({
    submission_id: submissionId,
    voter_address: voterAddress,
    vote,
    status: "pending",
    job_type: jobType,
    round_id: roundId,
    commitment,
    salt,
  });
  if (error) {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      event: "vote_enqueue_commit_reveal_error",
      jobType,
      error: error.message,
    }));
  }
}
