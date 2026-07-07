// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  ALGORITHM_VERSION,
  COHORT_FREE_SLOTS,
  COHORT_PAID_SLOTS,
  COHORT_SIZE,
  TICKET_CAP_REFERRALS,
  TICKET_CAP_JURY,
  drawLottery,
  freeSlotsFor,
  lotterySeed,
  seedToU32,
  shuffle,
  ticketsFor,
} from "../server/lib/lottery.js";

describe("lottery", () => {
  it("exposes a stable algorithm version", () => {
    expect(ALGORITHM_VERSION).toBe("mulberry32-fy-weighted/v2");
  });

  it("ticketsFor: 1 base + capped referral + capped jury tickets", () => {
    expect(ticketsFor({})).toBe(1);
    expect(ticketsFor({ referral_count: 3 })).toBe(4);
    expect(ticketsFor({ referral_count: 99 })).toBe(1 + TICKET_CAP_REFERRALS);
    expect(ticketsFor({ referral_count: 2, jury_tickets: 2 })).toBe(5);
    expect(ticketsFor({ referral_count: 99, jury_tickets: 99 })).toBe(1 + TICKET_CAP_REFERRALS + TICKET_CAP_JURY);
  });

  it("weights the draw: heavy-ticket candidates win more often across seeds", () => {
    // One whale (max tickets) among 20 singles; across many independent
    // seeds the whale should be drawn far more often than a single.
    const candidates = [
      { address: "0xwhale", referral_count: 5, jury_tickets: 5 },
      ...Array.from({ length: 20 }, (_, i) => ({ address: `0xsingle${i}`, referral_count: 0 })),
    ];
    let whaleWins = 0;
    const rounds = 200;
    for (let i = 0; i < rounds; i += 1) {
      const r = drawLottery(candidates, { launchAtIso: `2026-07-14T18:00:${String(i % 60).padStart(2, "0")}Z-${i}`, cohort: 1, slots: 3 });
      if (r.drawn.some((d) => d.address === "0xwhale")) whaleWins += 1;
    }
    // 11 tickets vs 20 singles: whale expectation is ~80%+ for 3 slots;
    // a uniform draw would give ~14%. 50% is a safe deterministic bound.
    expect(whaleWins / rounds).toBeGreaterThan(0.5);
  });

  it("never draws the same address twice even with many tickets", () => {
    const candidates = [
      { address: "0xwhale", referral_count: 5, jury_tickets: 5 },
      { address: "0xother", referral_count: 0 },
    ];
    const r = drawLottery(candidates, { launchAtIso: "2026-07-14T18:00:00Z", cohort: 1, slots: 2 });
    const addrs = r.drawn.map((d) => d.address);
    expect(new Set(addrs).size).toBe(addrs.length);
    expect(addrs).toHaveLength(2);
  });

  it("computes a deterministic seed", () => {
    expect(lotterySeed({ launchAtIso: "2026-06-14T14:00:00Z", cohort: 1 }))
      .toBe("2026-06-14T14:00:00Z:cohort-1:lottery");
  });

  it("is deterministic: same seed produces same draw", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => ({
      address: `0x000000000000000000000000000000000000000${i.toString(16)}`,
      username: `user${i}`,
      referral_count: 0,
    }));
    const opts = { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 25 };
    const a = drawLottery(candidates, opts);
    const b = drawLottery(candidates, opts);
    expect(a.drawn.map((d) => d.address)).toEqual(b.drawn.map((d) => d.address));
    expect(a.seed).toBe(b.seed);
  });

  it("is seeded by launchAtIso + cohort — different launches yield different draws", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => ({
      address: `0x000000000000000000000000000000000000000${i.toString(16)}`,
      username: null,
      referral_count: 0,
    }));
    const a = drawLottery(candidates, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 25 });
    const b = drawLottery(candidates, { launchAtIso: "2026-06-15T14:00:00Z", cohort: 1, slots: 25 });
    expect(a.drawn.map((d) => d.address)).not.toEqual(b.drawn.map((d) => d.address));
  });

  it("does not mutate the caller's candidates array", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      address: `0x${i.toString(16).padStart(40, "0")}`,
      username: null,
      referral_count: 0,
    }));
    const original = candidates.map((c) => c.address);
    drawLottery(candidates, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 5 });
    expect(candidates.map((c) => c.address)).toEqual(original);
  });

  it("returns all candidates when slots >= candidates.length", () => {
    const candidates = [
      { address: "0xa", username: null, referral_count: 0 },
      { address: "0xb", username: null, referral_count: 0 },
    ];
    const result = drawLottery(candidates, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 5 });
    expect(result.drawn).toHaveLength(2);
    expect(result.rolledToCohort2).toHaveLength(0);
    expect(result.candidates).toBe(2);
  });

  it("returns empty draw when slots = 0", () => {
    const candidates = [
      { address: "0xa", username: null, referral_count: 0 },
    ];
    const result = drawLottery(candidates, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 0 });
    expect(result.drawn).toHaveLength(0);
    expect(result.rolledToCohort2).toHaveLength(1);
  });

  it("preserves referral_count and username in the draw output", () => {
    const candidates = [
      { address: "0xa", username: "alice", referral_count: 7 },
      { address: "0xb", username: null, referral_count: 0 },
    ];
    const result = drawLottery(candidates, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 1 });
    expect(result.drawn).toHaveLength(1);
    const drawn = result.drawn[0];
    expect(["alice", null]).toContain(drawn.username);
    expect(typeof drawn.referral_count).toBe("number");
    expect(drawn.rank).toBe(1);
  });

  it("assigns ranks 1..slots in draw order", () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      address: `0x${i.toString(16).padStart(40, "0")}`,
      username: null,
      referral_count: 0,
    }));
    const result = drawLottery(candidates, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 5 });
    expect(result.drawn.map((d) => d.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects non-array candidates", () => {
    expect(() => drawLottery(null, { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 1 })).toThrow(TypeError);
    expect(() => drawLottery("not an array", { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: 1 })).toThrow(TypeError);
  });

  it("rejects negative slots", () => {
    expect(() => drawLottery([], { launchAtIso: "2026-06-14T14:00:00Z", cohort: 1, slots: -1 })).toThrow(RangeError);
  });

  it("shuffle is a permutation (every element still present)", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...arr];
    const rng = () => 0.5; // deterministic-but-fair
    shuffle(arr, rng);
    expect([...arr].sort()).toEqual([...original].sort());
  });

  it("seedToU32 returns a 32-bit unsigned integer", () => {
    const u = seedToU32("test-seed");
    expect(Number.isInteger(u)).toBe(true);
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});

describe("freeSlotsFor (dynamic slot allocation)", () => {
  it("exposes the cohort constants", () => {
    expect(COHORT_SIZE).toBe(50);
    expect(COHORT_PAID_SLOTS).toBe(25);
    expect(COHORT_FREE_SLOTS).toBe(25);
  });

  it("expands the free lottery when paid < 25 (0 paid → 50 free)", () => {
    expect(freeSlotsFor(0)).toBe(50);
  });

  it("partially expands at intermediate paid counts", () => {
    expect(freeSlotsFor(10)).toBe(40);
    expect(freeSlotsFor(20)).toBe(30);
    expect(freeSlotsFor(24)).toBe(26);
  });

  it("caps at 25 when paid = 25 (paid cap reached)", () => {
    expect(freeSlotsFor(25)).toBe(25);
  });

  it("shrinks to 20 when paid = 30 (cohort cap reached)", () => {
    expect(freeSlotsFor(30)).toBe(20);
  });

  it("returns 0 when paid = 50 (cohort full, no lottery needed)", () => {
    expect(freeSlotsFor(50)).toBe(0);
    expect(freeSlotsFor(100)).toBe(0);
  });

  it("never exceeds the cohort size (no 51st person)", () => {
    // Even if paid were somehow negative (bad data), the function
    // clamps to the cohort size.
    expect(freeSlotsFor(-100)).toBe(50);
  });

  it("guards against bad input", () => {
    expect(freeSlotsFor(undefined)).toBe(50);  // treated as 0
    expect(freeSlotsFor(null)).toBe(50);       // treated as 0
    expect(freeSlotsFor(NaN)).toBe(50);        // treated as 0
    expect(freeSlotsFor("not a number")).toBe(50);
  });

  it("is monotonic non-increasing in paid count", () => {
    let prev = 50;
    for (let paid = 0; paid <= 60; paid += 1) {
      const slots = freeSlotsFor(paid);
      expect(slots).toBeLessThanOrEqual(prev);
      prev = slots;
    }
  });
});
