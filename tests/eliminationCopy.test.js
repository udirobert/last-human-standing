import { describe, expect, it } from "vitest";
import { formatEliminationReason } from "../src/lib/eliminationReason.js";

describe("formatEliminationReason", () => {
  it("formats too_slow copy with spots away", () => {
    const out = formatEliminationReason({ code: "too_slow", day: 1, rank: 28, cap: 25, spotsAway: 3 });
    expect(out?.title).toBe("Didn't make the cut");
    expect(out?.body).toContain("3 spots");
  });

  it("formats not_drawn copy for lottery days", () => {
    const out = formatEliminationReason({ code: "not_drawn", day: 3, cap: 6, eligible: 9 });
    expect(out?.title).toBe("Not drawn");
    expect(out?.body).toContain("9 eligible");
    expect(out?.body).toContain("lottery");
  });

  it("formats no_checkin copy", () => {
    const out = formatEliminationReason({ code: "no_checkin", day: 2 });
    expect(out?.body).toContain("Day 2");
  });
});
