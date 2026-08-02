/**
 * Pure jury-board builder — ranks ELIMINATED players by verdict accuracy
 * and influence (jury tickets). Gives the eliminated a continuing objective
 * (design review finding 5): compete on accuracy toward ×2 vote weight and
 * on tickets that carry into the next cohort.
 *
 * Accuracy logic mirrors /api/detective-board exactly: a vote counts as
 * resolved only once its submission is `verified` or `flagged`, and counts
 * as correct when it agreed with the final verdict.
 *
 * Public posture: rows are scoped to verified-human eliminated players
 * (agents are excluded, matching the roster's anti-meta-game strip) and to
 * voters who cleared `minResolved` resolved votes (the same bar as the
 * jury weight unlock).
 */

/**
 * @param {object} opts
 * @param {Array<{voter_address:string, submission_id:string|number, vote:string}>} [opts.votes]
 * @param {Array<{id:string|number, status:string}>} [opts.submissions]
 * @param {Array<{address:string, username?:string|null, jury_tickets?:number, eliminated?:boolean, eliminated_at_day?:number|null, is_agent?:boolean}>} [opts.users]
 * @param {"accuracy"|"influence"} [opts.sort]
 * @param {number} [opts.minResolved] Resolved-vote bar (JURY_MIN_RESOLVED)
 * @param {number} [opts.minAccuracyPct] Jury weight unlock, as a percentage (JURY_MIN_ACCURACY × 100)
 * @param {number} [opts.weight] Jury vote multiplier (JURY_WEIGHT)
 * @returns {Array<{address:string, username:string|null, total:number, correct:number, accuracy:number, juryTickets:number, isJury:boolean, weight:number, eliminatedAtDay:number|null}>}
 */
export function buildJuryBoard({
  votes = [],
  submissions = [],
  users = [],
  sort = "accuracy",
  minResolved = 5,
  minAccuracyPct = 80,
  weight = 2,
} = {}) {
  const statusById = new Map((submissions || []).map((s) => [s.id, s.status]));

  // Voter -> { total, correct } over resolved submissions only.
  const voterMap = new Map();
  for (const v of votes || []) {
    const status = statusById.get(v.submission_id);
    if (status !== "verified" && status !== "flagged") continue;
    const entry = voterMap.get(v.voter_address) || { total: 0, correct: 0 };
    entry.total += 1;
    if ((status === "verified" && v.vote === "real") || (status === "flagged" && v.vote === "fake")) {
      entry.correct += 1;
    }
    voterMap.set(v.voter_address, entry);
  }

  const userByAddr = new Map((users || []).map((u) => [String(u.address).toLowerCase(), u]));
  const board = [];
  for (const [address, { total, correct }] of voterMap) {
    const u = userByAddr.get(String(address).toLowerCase());
    if (!u || u.is_agent || !u.eliminated) continue;
    if (total < minResolved) continue;
    const accuracy = Math.round((correct / total) * 100);
    const isJury = accuracy >= minAccuracyPct;
    board.push({
      address,
      username: u?.username ?? null,
      total,
      correct,
      accuracy,
      juryTickets: u?.jury_tickets ?? 0,
      isJury,
      weight: isJury ? weight : 1,
      eliminatedAtDay: u?.eliminated_at_day ?? null,
    });
  }

  // "Influence" = tickets × vote weight: a juror's tickets carry ×2 sway,
  // so their bench presence reflects the doubled vote power.
  board.sort(
    sort === "influence"
      ? (a, b) => b.juryTickets * b.weight - a.juryTickets * a.weight || b.accuracy - a.accuracy || b.total - a.total
      : (a, b) => b.accuracy - a.accuracy || b.total - a.total || b.juryTickets - a.juryTickets,
  );

  return board.slice(0, 50);
}
