// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CREDIT_AWARDS,
  MINTABLE_REASONS,
  awardValue,
  buildAward,
  summarizeLedger,
  canAfford,
  splitSeasonPodium,
} from "../server/lib/creditLedger.js";

const A = "0xaaaa";
const B = "0xbbbb";

describe("credit awards", () => {
  it("only IRL reasons mint a value", () => {
    expect(awardValue("transfer_delivered")).toBe(CREDIT_AWARDS.transfer_delivered);
    expect(awardValue("transfer_intercepted")).toBe(CREDIT_AWARDS.transfer_intercepted);
    expect(awardValue("sprint_participation")).toBe(CREDIT_AWARDS.sprint_participation);
  });

  // Spend/escrow reasons must never mint — a market operation creates no
  // new credits, it only moves existing ones. This is the closed-economy
  // boundary from docs/TOKEN_ROUNDS.md §6.
  it("returns zero for non-minting reasons", () => {
    expect(awardValue("market_spend")).toBe(0);
    expect(awardValue("market_escrow")).toBe(0);
    expect(awardValue("market_refund")).toBe(0);
    expect(awardValue("market_payout")).toBe(0);
    expect(awardValue("nonsense")).toBe(0);
  });

  it("lists exactly the mintable reasons as the award keys", () => {
    expect(MINTABLE_REASONS).toEqual(Object.keys(CREDIT_AWARDS));
  });
});

describe("buildAward", () => {
  it("builds one positive entry for a valid IRL action", () => {
    const [entry] = buildAward({ address: A, regionId: "emea", reason: "transfer_delivered" });
    expect(entry).toMatchObject({
      address: "0xaaaa",
      region_id: "emea",
      amount: CREDIT_AWARDS.transfer_delivered,
      reason: "transfer_delivered",
    });
  });

  it("refuses to mint for a non-minting reason", () => {
    expect(buildAward({ address: A, regionId: "emea", reason: "market_payout" })).toEqual([]);
  });

  it("refuses to mint without an address or region", () => {
    expect(buildAward({ regionId: "emea", reason: "transfer_delivered" })).toEqual([]);
    expect(buildAward({ address: A, reason: "transfer_delivered" })).toEqual([]);
  });

  it("defaults the season and normalizes the ref", () => {
    const [entry] = buildAward({ address: A, regionId: "emea", reason: "sprint_participation", ref: 42 });
    expect(entry.season).toBe(1);
    expect(entry.ref).toBe("42");
  });

  it("returns an empty array for no input", () => {
    expect(buildAward()).toEqual([]);
  });
});

describe("summarizeLedger", () => {
  const entries = [
    { address: A, amount: 10, reason: "transfer_delivered" },
    { address: A, amount: 6, reason: "transfer_intercepted" },
    { address: A, amount: -4, reason: "market_spend" },
    { address: B, amount: 20, reason: "sprint_participation" },
  ];

  it("nets minted against spent", () => {
    expect(summarizeLedger(entries, A)).toMatchObject({ balance: 12, minted: 16, spent: 4, entries: 3 });
  });

  it("is case-insensitive on the address", () => {
    expect(summarizeLedger(entries, "0xAAAA").balance).toBe(12);
    expect(summarizeLedger(entries, A.toUpperCase()).balance).toBe(12);
  });

  it("ignores other players' entries", () => {
    expect(summarizeLedger(entries, "0xcccc")).toMatchObject({ balance: 0, entries: 0 });
  });

  it("handles an empty or missing ledger", () => {
    expect(summarizeLedger([], A)).toMatchObject({ balance: 0, entries: 0 });
    expect(summarizeLedger(null, A)).toMatchObject({ balance: 0, entries: 0 });
  });

  it("treats a missing amount as zero rather than NaN", () => {
    expect(summarizeLedger([{ address: A }], A).balance).toBe(0);
  });
});

describe("canAfford", () => {
  const entries = [{ address: A, amount: 10, reason: "transfer_delivered" }];

  it("allows a spend within balance", () => {
    expect(canAfford(entries, A, 10)).toMatchObject({ ok: true, reason: null });
  });

  it("refuses a spend above balance", () => {
    expect(canAfford(entries, A, 11)).toMatchObject({ ok: false, reason: "insufficient_credits" });
  });

  // A closed economy must never let a balance go negative, or credits become
  // unboundedly printable via escrow.
  it("refuses a non-positive cost", () => {
    expect(canAfford(entries, A, 0)).toMatchObject({ ok: false, reason: "invalid_amount" });
    expect(canAfford(entries, A, -5)).toMatchObject({ ok: false, reason: "invalid_amount" });
  });

  it("refuses when the player has nothing", () => {
    expect(canAfford(entries, B, 1).reason).toBe("insufficient_credits");
  });
});

describe("splitSeasonPodium", () => {
  it("splits the pool pro-rata by score", () => {
    const r = splitSeasonPodium(100, [
      { address: A, score: 30 },
      { address: B, score: 10 },
    ]);
    expect(r.poolAmount).toBe(100);
    expect(r.shares[0]).toMatchObject({ address: A, share: 75 });
    expect(r.shares[1]).toMatchObject({ address: B, share: 25 });
    expect(r.unallocated).toBe(0);
  });

  it("ignores zero-score players", () => {
    const r = splitSeasonPodium(100, [{ address: A, score: 10 }, { address: B, score: 0 }]);
    expect(r.recipients).toBe(1);
  });

  it("handles an empty field", () => {
    expect(splitSeasonPodium(100, [])).toMatchObject({ recipients: 0, unallocated: 100 });
  });
});