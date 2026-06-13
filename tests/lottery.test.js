// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  ALGORITHM_VERSION,
  drawLottery,
  lotterySeed,
  seedToU32,
  shuffle,
} from "../server/lib/lottery.js";

describe("lottery", () => {
  it("exposes a stable algorithm version", () => {
    expect(ALGORITHM_VERSION).toBe("mulberry32-fy/v1");
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
