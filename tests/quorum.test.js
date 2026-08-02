// @vitest-environment node
import { describe, it, expect } from "vitest";
import { scaledQuorumForRoster } from "../server/index.js";

describe("scaledQuorumForRoster", () => {
  it("returns the normal quorum when the roster is empty", () => {
    expect(scaledQuorumForRoster({ roster: 0 })).toBe(8);
  });

  it("scales a small roster down to a reachable quorum (floored at min)", () => {
    // 6 players * 0.3 = 1.8 -> ceil 2 -> floored at 3
    expect(scaledQuorumForRoster({ roster: 6 })).toBe(3);
    // 10 * 0.3 = 3 -> 3
    expect(scaledQuorumForRoster({ roster: 10 })).toBe(3);
  });

  it("caps at the normal quorum for large rosters", () => {
    // 25 * 0.3 = 7.5 -> ceil 8 -> capped at 8
    expect(scaledQuorumForRoster({ roster: 25 })).toBe(8);
    expect(scaledQuorumForRoster({ roster: 40 })).toBe(8);
  });

  it("never exceeds normal and never drops below minimum", () => {
    for (const roster of [1, 3, 8, 12, 25, 50, 200]) {
      const q = scaledQuorumForRoster({ roster });
      expect(q).toBeGreaterThanOrEqual(3);
      expect(q).toBeLessThanOrEqual(8);
    }
  });

  it("respects custom bounds", () => {
    expect(scaledQuorumForRoster({ roster: 20, normal: 10, ratio: 0.2, min: 2 })).toBe(4);
  });
});
