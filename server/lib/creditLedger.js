/**
 * Credit ledger — docs/TOKEN_ROUNDS.md §6.
 *
 * Credits are CLOSED and NON-WITHDRAWABLE. Cash enters the game only at season
 * settlement for podium positions. That single rule is what kills RMT, bots,
 * and the gold-economy death spiral at once.
 *
 * "Only IRL actions mint credits" — this is the FAUCET. The always-on market
 * is the DEMAND side. That link is load-bearing: it is the only reason the
 * 24/7 layer deserves to exist at all.
 *
 * This module is the SINGLE place that decides what an event is worth. If a
 * new credit source appears anywhere else in the codebase, that is a bug.
 *
 * Pure math — persistence lives in the migration + a thin server wrapper.
 */

import { splitJuryBounty } from "./juryBounty.js";

/**
 * Award value per mintable reason. Deliberately small numbers: these are
 * game-scoring units, not currency, and a player should be able to earn a
 * meaningful stack in a single sprint of actually showing up.
 */
export const CREDIT_AWARDS = {
  transfer_delivered:   10,
  transfer_intercepted:  6,
  sprint_participation:  4,
  crew_contribution:     3,
  season_podium:        50,
};

/** Reasons that may post a POSITIVE (minting) amount. Everything else is spend/escrow. */
export const MINTABLE_REASONS = Object.keys(CREDIT_AWARDS);

/**
 * How much an event is worth, or 0 when it does not mint.
 * @param {string} reason
 * @returns {number}
 */
export function awardValue(reason) {
  return CREDIT_AWARDS[reason] || 0;
}

/**
 * Net balance of an address across a set of signed ledger entries.
 *
 * @param {Array<{address:string, amount:number, reason:string}>} entries
 * @param {string} address
 * @returns {{balance:number, minted:number, spent:number, entries:number}}
 */
export function summarizeLedger(entries, address) {
  const addr = typeof address === "string" ? address.toLowerCase() : "";
  const mine = (entries || []).filter((e) => lower(e?.address) === addr);

  let minted = 0;
  let spent = 0;
  for (const e of mine) {
    const amt = Math.floor(Number(e?.amount) || 0);
    if (amt > 0) minted += amt;
    else spent += Math.abs(amt);
  }

  return {
    balance: minted - spent,
    minted,
    spent,
    entries: mine.length,
  };
}

/**
 * Build the signed ledger entries for a confirmed IRL action.
 * Returns an empty array for reasons that must not mint (a defence-in-depth
 * check — the DB check constraint is the real gate).
 *
 * @param {{address:string, regionId:string, season?:number, reason:string, ref?:string, amount?:number}} input
 * @returns {Array<{address:string, region_id:string, season:number, amount:number, reason:string, ref:string|null}>}
 */
export function buildAward(input) {
  const { address, regionId, season = 1, reason, ref = null } = input || {};
  const value = awardValue(reason);
  if (!value) return [];
  if (!address || !regionId || !MINTABLE_REASONS.includes(reason)) return [];

  return [{
    address: String(address).toLowerCase(),
    region_id: regionId,
    season,
    amount: value,
    reason,
    ref: ref == null ? null : String(ref),
  }];
}

/**
 * Validate that an address can afford a spend without going negative.
 *
 * @param {Array<object>} entries
 * @param {string} address
 * @param {number} cost
 * @returns {{ok:boolean, balance:number, reason:string|null}}
 */
export function canAfford(entries, address, cost) {
  const amount = Math.floor(Number(cost) || 0);
  if (amount <= 0) return { ok: false, balance: 0, reason: "invalid_amount" };
  const { balance } = summarizeLedger(entries, address);
  if (balance < amount) return { ok: false, balance, reason: "insufficient_credits" };
  return { ok: true, balance, reason: null };
}

/**
 * Split a season's podium credits across the top finishers.
 * Delegates to the existing, already-tested jury split so there is exactly
 * one pro-rata implementation in the codebase.
 *
 * @param {number} poolAmount
 * @param {Array<{address:string, score:number}>} standings
 * @returns {{pool:number, recipients:number, shares:Array, unallocated:number}}
 */
export function splitSeasonPodium(poolAmount, standings) {
  const eligible = (standings || [])
    .filter((s) => Number(s?.score) > 0)
    .map((s) => ({ address: String(s.address).toLowerCase(), juryTickets: Math.floor(Number(s.score)) }));
  return splitJuryBounty(poolAmount, eligible);
}

function lower(v) {
  return typeof v === "string" ? v.toLowerCase() : "";
}

export default {
  CREDIT_AWARDS,
  MINTABLE_REASONS,
  awardValue,
  buildAward,
  summarizeLedger,
  canAfford,
  splitSeasonPodium,
};