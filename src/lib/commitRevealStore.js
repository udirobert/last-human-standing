/**
 * Browser-held commit–reveal ballots. Salts never leave the device except
 * on POST /api/vote/reveal.
 *
 * Key format: lhs:vote-commit:v1:{cohort}:{roundId}:{submissionId}:{voter}
 */

const PREFIX = "lhs:vote-commit:v1";

function storageKey({ cohort, roundId, submissionId, voter }) {
  const addr = String(voter || "").toLowerCase();
  return `${PREFIX}:${cohort}:${roundId}:${submissionId}:${addr}`;
}

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCommitBallot({
  cohort,
  roundId,
  submissionId,
  voter,
  vote,
  salt,
  commitment,
  status = "committed",
}) {
  const key = storageKey({ cohort, roundId, submissionId, voter });
  const row = {
    cohort,
    roundId,
    submissionId,
    voter: String(voter).toLowerCase(),
    vote,
    salt,
    commitment,
    status,
    savedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(row));
  return row;
}

export function getCommitBallot({ cohort, roundId, submissionId, voter }) {
  return readRaw(storageKey({ cohort, roundId, submissionId, voter }));
}

export function markBallotRevealed({ cohort, roundId, submissionId, voter }) {
  const existing = getCommitBallot({ cohort, roundId, submissionId, voter });
  if (!existing) return null;
  const next = { ...existing, status: "revealed", revealedAt: Date.now() };
  localStorage.setItem(storageKey({ cohort, roundId, submissionId, voter }), JSON.stringify(next));
  return next;
}

export function clearCommitBallot({ cohort, roundId, submissionId, voter }) {
  localStorage.removeItem(storageKey({ cohort, roundId, submissionId, voter }));
}

/** Pending reveals for a voter in one round (status === committed). */
export function listPendingReveals({ cohort, roundId, voter }) {
  const addr = String(voter || "").toLowerCase();
  const needle = `${PREFIX}:${cohort}:${roundId}:`;
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(needle)) continue;
      const row = readRaw(key);
      if (!row || row.voter !== addr) continue;
      if (row.status !== "committed") continue;
      out.push(row);
    }
  } catch {
    /* private browsing */
  }
  return out.sort((a, b) => Number(a.submissionId) - Number(b.submissionId));
}
