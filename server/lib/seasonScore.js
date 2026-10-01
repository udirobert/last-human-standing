/**
 * Season scoring and standings — docs/TOKEN_ROUNDS.md §5.3, §5.4.
 *
 * v3 drops the daily cull. "Last Human Standing" told you on arrival that you
 * would be ejected in 24 hours, so nobody invested in a format designed to
 * throw them out; real money on the pot just made people churn faster once
 * they lost.
 *
 * So elimination becomes a STATUS, never an exile: knocked-out players keep
 * full social and market standing. This module computes the board that
 * replaces it.
 *
 * The named risk: if standings are invisible, the season board becomes the
 * thing nobody looks at. Ranking is therefore part of the product, not a
 * reporting detail.
 *
 * Pure functions — persistence lives in the route module.
 */

import { awardValue } from "./creditLedger.js";

/**
 * Score weights. Delivery of a token is the heaviest signal because it is
 * the only action that is impossible without being there.
 */
export const SCORE_WEIGHTS = {
  transfer_delivered:   10,
  transfer_intercepted:  6,
  sprint_participation:  4,
};

/**
 * Score an address from its season events.
 *
 * @param {string} address
 * @param {Array<{address:string, reason:string, ref?:string}>} events
 * @returns {{score:number, transfers:number, sprints:number, breakdown:object}}
 */
export function seasonScoreFor(address, events) {
  const addr = typeof address === "string" ? address.toLowerCase() : "";
  const mine = (events || []).filter((e) => String(e?.address || "").toLowerCase() === addr);

  const breakdown = { transfer_delivered: 0, transfer_intercepted: 0, sprint_participation: 0 };
  const counts = { transfer_delivered: 0, sprint_participation: 0 };
  const refs = new Set();

  for (const e of mine) {
    const w = SCORE_WEIGHTS[e?.reason];
    if (!w) continue;
    breakdown[e.reason] += w;
    if (e.reason in counts) counts[e.reason] += 1;
    if (e.ref != null) refs.add(String(e.ref));
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    score,
    transfers: counts.transfer_delivered,
    sprints: counts.sprint_participation,
    breakdown,
    refs: refs.size,
  };
}

/**
 * Rank standings, deterministically.
 *
 * Ranking ties break by credits, then transfers, then address — a total
 * order, so two players on the same score never swap ranks between renders.
 *
 * @param {Array<{address:string, score?:number, credits?:number, transfers?:number, crew_id?:number|null, crew_name?:string}>} entries
 * @param {{limit?:number}} [opts]
 * @returns {Array<object>} entries with rank, sorted best-first
 */
export function rankStandings(entries, { limit = 100 } = {}) {
  const rows = (entries || [])
    .filter((e) => e && e.address)
    .map((e) => ({
      address: String(e.address).toLowerCase(),
      crew_id: e.crew_id ?? null,
      crew_name: e.crew_name ?? null,
      score: Math.max(0, Math.floor(Number(e.score) || 0)),
      credits: Math.max(0, Math.floor(Number(e.credits) || 0)),
      transfers: Math.max(0, Math.floor(Number(e.transfers) || 0)),
    }))
    .sort((a, b) => (
      b.score - a.score ||
      b.credits - a.credits ||
      b.transfers - a.transfers ||
      (a.address < b.address ? -1 : a.address > b.address ? 1 : 0)
    ));

  return rows.slice(0, limit).map((row, i) => ({ rank: i + 1, ...row }));
}

/**
 * Crew standing, aggregated per crew.
 *
 * Scarcity BETWEEN factions is what generates narrative for free — you do
 * not have to write any of it. This is the number that makes it legible.
 *
 * @param {Array<{crew_id:number, crew_name:string, color?:string, address:string, score:number, credits:number}>} ranked
 * @returns {Array<{crew_id:number, crew_name:string, members:number, score:number, credits:number}>}
 */
export function rankCrews(ranked) {
  const byCrew = new Map();

  for (const row of ranked || []) {
    if (!row || row.crew_id == null) continue;
    const id = row.crew_id;
    if (!byCrew.has(id)) {
      byCrew.set(id, {
        crew_id: id,
        crew_name: row.crew_name || `Crew ${id}`,
        color: row.color || null,
        members: 0,
        score: 0,
        credits: 0,
      });
    }
    const crew = byCrew.get(id);
    crew.members += 1;
    crew.score += Math.max(0, Math.floor(Number(row.score) || 0));
    crew.credits += Math.max(0, Math.floor(Number(row.credits) || 0));
  }

  return [...byCrew.values()].sort((a, b) => b.score - a.score || (a.crew_id - b.crew_id));
}

/**
 * Credits a crew's members have earned this season, for the reciprocity loop.
 *
 * "Make skipping cost other people": your crew's score drops and teammates
 * notice you were not there. Obligation compounds where motivation does not.
 *
 * @param {Array<{address:string, crew_id:number|null}>} members
 * @param {Array<{address:string, reason:string}>} events
 * @returns {Map<number, number>} crewId -> contribution
 */
export function crewContributions(members, events) {
  const crewOf = new Map();
  for (const m of members || []) {
    if (m && m.address != null && m.crew_id != null) {
      crewOf.set(String(m.address).toLowerCase(), m.crew_id);
    }
  }

  const totals = new Map();
  for (const e of events || []) {
    const crewId = crewOf.get(String(e?.address || "").toLowerCase());
    if (crewId == null) continue;
    const value = awardValue(e?.reason);
    if (!value) continue;
    totals.set(crewId, (totals.get(crewId) || 0) + value);
  }

  return totals;
}

export default {
  SCORE_WEIGHTS,
  seasonScoreFor,
  rankStandings,
  rankCrews,
  crewContributions,
};