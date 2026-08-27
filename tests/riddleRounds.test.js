// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  drawSurvivalLottery,
  survivalSeedString,
  ALGORITHM_VERSION,
} from "../server/lib/survivalLottery.js";
import {
  computeSpecHash,
  verifySpecHash,
  getRiddleForDay,
  allRiddleCommits,
  RIDDLE_SETS,
} from "../server/lib/riddleSpecs.js";
import { splitJuryBounty } from "../server/lib/juryBounty.js";
import { lotterySeed } from "../server/lib/lottery.js";

// ── Survival Lottery ──

describe("survivalSeedString", () => {
  it("produces a deterministic, auditable seed per cohort+day", () => {
    const cohort = lotterySeed({ launchAtIso: "2026-09-01T18:00:00Z", cohort: 1 });
    expect(survivalSeedString(cohort, 3)).toBe(
      "2026-09-01T18:00:00Z:cohort-1:lottery:day-3:survival",
    );
  });
});

describe("drawSurvivalLottery", () => {
  const cohortSeed = "2026-09-01T18:00:00Z:cohort-1:lottery";
  const makeEligible = (n) =>
    Array.from({ length: n }, (_, i) => ({
      address: `0x${i.toString(16).padStart(40, "0")}`,
      rank: i + 1,
    }));

  it("is deterministic: same seed + same list → same survivors", () => {
    const eligible = makeEligible(20);
    const a = drawSurvivalLottery(eligible, { cohortSeed, day: 3, cap: 6 });
    const b = drawSurvivalLottery(eligible, { cohortSeed, day: 3, cap: 6 });
    expect(a.survivors).toEqual(b.survivors);
  });

  it("differs across days (per-day seed)", () => {
    const eligible = makeEligible(20);
    const d1 = drawSurvivalLottery(eligible, { cohortSeed, day: 1, cap: 6 });
    const d3 = drawSurvivalLottery(eligible, { cohortSeed, day: 3, cap: 6 });
    expect(d1.survivors).not.toEqual(d3.survivors);
  });

  it("differs across cohorts", () => {
    const eligible = makeEligible(20);
    const c1 = drawSurvivalLottery(eligible, {
      cohortSeed: "2026-09-01T18:00:00Z:cohort-1:lottery", day: 3, cap: 6,
    });
    const c2 = drawSurvivalLottery(eligible, {
      cohortSeed: "2026-09-13T18:00:00Z:cohort-2:lottery", day: 3, cap: 6,
    });
    expect(c1.survivors).not.toEqual(c2.survivors);
  });

  it("returns overflow=true when eligible > cap", () => {
    const r = drawSurvivalLottery(makeEligible(20), { cohortSeed, day: 1, cap: 6 });
    expect(r.overflow).toBe(true);
    expect(r.survivors).toHaveLength(6);
    expect(r.eliminated).toHaveLength(14);
  });

  it("returns overflow=false when eligible <= cap", () => {
    const r = drawSurvivalLottery(makeEligible(5), { cohortSeed, day: 1, cap: 6 });
    expect(r.overflow).toBe(false);
    expect(r.survivors).toHaveLength(5);
    expect(r.eliminated).toHaveLength(0);
  });

  it("is input-order independent (sorts by address)", () => {
    const eligible = makeEligible(10);
    const a = drawSurvivalLottery(eligible, { cohortSeed, day: 2, cap: 5 });
    const b = drawSurvivalLottery([...eligible].reverse(), { cohortSeed, day: 2, cap: 5 });
    expect(a.survivors).toEqual(b.survivors);
  });

  it("handles edge cases", () => {
    expect(() => drawSurvivalLottery(null, { cohortSeed, day: 1, cap: 5 })).toThrow();
    expect(() => drawSurvivalLottery([], { cohortSeed, day: 1, cap: -1 })).toThrow();
    const r = drawSurvivalLottery([], { cohortSeed, day: 1, cap: 5 });
    expect(r.survivors).toHaveLength(0);
  });

  it("reports the algorithm version", () => {
    expect(ALGORITHM_VERSION).toMatch(/^mulberry32/);
  });
});

// ── Riddle Specs ──

describe("computeSpecHash", () => {
  it("is deterministic for the same spec", () => {
    const spec = { a: 1, b: ["x", "y"] };
    expect(computeSpecHash(spec)).toBe(computeSpecHash(spec));
  });

  it("produces a 0x-prefixed hex hash", () => {
    expect(computeSpecHash({ a: 1 })).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is independent of key insertion order (recursive canonical form)", () => {
    const a = { z: { b: 2, a: 1 }, a: ["x", "y"] };
    const b = { a: ["x", "y"], z: { a: 1, b: 2 } };
    expect(computeSpecHash(a)).toBe(computeSpecHash(b));
  });

  it("preserves array order (arrays are meaningful)", () => {
    expect(computeSpecHash({ a: ["x", "y"] })).not.toBe(
      computeSpecHash({ a: ["y", "x"] }),
    );
  });
});

describe("verifySpecHash", () => {
  it("verifies a matching spec", () => {
    const spec = { literal_categories: ["cafe"], hard_rejects: ["stock"] };
    const hash = computeSpecHash(spec);
    expect(verifySpecHash(spec, hash)).toBe(true);
  });

  it("rejects a tampered spec", () => {
    const spec = { literal_categories: ["cafe"] };
    const hash = computeSpecHash(spec);
    expect(verifySpecHash({ literal_categories: ["bar"] }, hash)).toBe(false);
  });

  it("rejects invalid hashes", () => {
    expect(verifySpecHash({}, null)).toBe(false);
    expect(verifySpecHash({}, "not-a-hash")).toBe(false);
  });
});

describe("getRiddleForDay", () => {
  it("returns a riddle for each day 1-5", () => {
    for (let day = 1; day <= 5; day++) {
      const r = getRiddleForDay(day);
      expect(r).not.toBeNull();
      expect(r.day).toBe(day);
      expect(r.riddle).toBeTruthy();
      expect(r.spec).toBeTruthy();
      expect(r.specHash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });

  it("returns null for invalid days", () => {
    expect(getRiddleForDay(0)).toBeNull();
    expect(getRiddleForDay(6)).toBeNull();
    expect(getRiddleForDay(-1)).toBeNull();
  });
});

describe("allRiddleCommits", () => {
  it("returns 5 commits with unique hashes", () => {
    const commits = allRiddleCommits();
    expect(commits).toHaveLength(5);
    const hashes = commits.map((c) => c.specHash);
    expect(new Set(hashes).size).toBe(5);
  });

  it("hashes match getRiddleForDay", () => {
    const commits = allRiddleCommits();
    for (const c of commits) {
      const r = getRiddleForDay(c.day);
      expect(c.specHash).toBe(r.specHash);
    }
  });
});

describe("RIDDLE_SETS", () => {
  it("each spec has the required fields", () => {
    for (const r of RIDDLE_SETS) {
      expect(r.spec.literal_categories).toBeInstanceOf(Array);
      expect(r.spec.required_elements).toBeInstanceOf(Array);
      expect(r.spec.interpretive_axes).toBeInstanceOf(Array);
      expect(r.spec.hard_rejects).toBeInstanceOf(Array);
    }
  });
});

// ── Jury Bounty ──

describe("splitJuryBounty", () => {
  it("splits pro-rata by jury tickets", () => {
    const jurors = [
      { address: "0xA", juryTickets: 10 },
      { address: "0xB", juryTickets: 5 },
      { address: "0xC", juryTickets: 5 },
    ];
    const r = splitJuryBounty(100, jurors);
    expect(r.totalTickets).toBe(20);
    expect(r.recipients).toBe(3);
    expect(r.shares[0].address).toBe("0xa");
    expect(r.shares[0].share).toBe(50);
  });

  it("handles zero pool or zero tickets", () => {
    expect(splitJuryBounty(0, [{ address: "0xA", juryTickets: 5 }]).shares).toHaveLength(0);
    expect(splitJuryBounty(100, [{ address: "0xA", juryTickets: 0 }]).shares).toHaveLength(0);
    expect(splitJuryBounty(100, []).shares).toHaveLength(0);
  });

  it("filters out jurors with 0 tickets", () => {
    const r = splitJuryBounty(50, [
      { address: "0xA", juryTickets: 10 },
      { address: "0xB", juryTickets: 0 },
    ]);
    expect(r.recipients).toBe(1);
    expect(r.shares[0].share).toBe(50);
  });

  it("dust goes to the highest-ticket juror", () => {
    const r = splitJuryBounty(99, [
      { address: "0xA", juryTickets: 1 },
      { address: "0xB", juryTickets: 1 },
    ]);
    expect(r.unallocated).toBe(0);
    expect(r.shares[0].share).toBe(50);
    expect(r.shares[1].share).toBe(49);
  });

  it("handles invalid inputs without throwing", () => {
    expect(() => splitJuryBounty(-5, [{ address: "0xA", juryTickets: 1 }])).not.toThrow();
    expect(() => splitJuryBounty(100, null)).not.toThrow();
    expect(() => splitJuryBounty("bad", [{ address: "0xA", juryTickets: 1 }])).not.toThrow();
  });
});

