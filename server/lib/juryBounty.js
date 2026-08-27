/**
 * Jury accuracy bounty — docs/RIDDLE_ROUNDS.md §4, item #1.
 *
 * "Eliminated jurors already get 2× weight for accuracy; close_day already
 * awards jury tickets to correct voters. Extend it: jurors whose votes match
 * the final consensus split a jury pool."
 *
 * For Sep 1: operator seeds a small jury pool; at cohort end it is split
 * pro-rata by accumulated jury tickets. Manual settlement, matching the
 * pilot posture (no new on-chain automation).
 *
 * The pool is a single number (WLD or cUSD). The split is:
 *   juror_share = pool × (juror_tickets / total_jury_tickets)
 *
 * This module is pure math — the DB persistence is in the migration + a
 * thin server wrapper. Testable in isolation.
 */

/**
 * Compute the pro-rata split of a jury bounty pool.
 *
 * @param {number} poolAmount      total pool in the smallest unit (wei, cents, etc.)
 * @param {Array<{address: string, juryTickets: number}>} jurors
 * @returns {{
 *   poolAmount: number,
 *   totalTickets: number,
 *   recipients: number,
 *   shares: Array<{address: string, juryTickets: number, share: number, sharePct: number}>,
 *   unallocated: number,   dust that doesn't divide evenly (operator keeps or rolls)
 * }}
 */
export function splitJuryBounty(poolAmount, jurors) {
  const pool = Math.max(0, Number(poolAmount) || 0);
  const eligible = (jurors || [])
    .filter((j) => Number(j.juryTickets) > 0)
    .map((j) => ({
      address: String(j.address).toLowerCase(),
      juryTickets: Math.max(0, Math.floor(Number(j.juryTickets))),
    }));

  const totalTickets = eligible.reduce((sum, j) => sum + j.juryTickets, 0);

  if (totalTickets === 0 || pool === 0) {
    return {
      poolAmount: pool,
      totalTickets: 0,
      recipients: 0,
      shares: [],
      unallocated: pool,
    };
  }

  let allocated = 0;
  const shares = eligible
    .sort((a, b) => b.juryTickets - a.juryTickets)
    .map((j) => {
      const share = Math.floor((pool * j.juryTickets) / totalTickets);
      allocated += share;
      return {
        address: j.address,
        juryTickets: j.juryTickets,
        share,
        sharePct: (j.juryTickets / totalTickets) * 100,
      };
    });

  // Dust from integer division — first recipient gets the remainder
  // (deterministic: highest ticket count gets the dust).
  const unallocated = pool - allocated;
  if (unallocated > 0 && shares.length > 0) {
    shares[0].share += unallocated;
  }

  return {
    poolAmount: pool,
    totalTickets,
    recipients: shares.length,
    shares,
    unallocated: 0,
  };
}

export default { splitJuryBounty };
