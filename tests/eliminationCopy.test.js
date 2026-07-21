import { describe, expect, it } from "vitest";
import { formatEliminationReason } from "../src/lib/eliminationReason.js";

describe("formatEliminationReason", () => {
  it("formats too_slow copy with spots away", () => {
    const out = formatEliminationReason({ code: "too_slow", day: 1, rank: 28, cap: 25, spotsAway: 3 });
    expect(out?.title).toBe("Too slow");
    expect(out?.body).toContain("3 spots");
  });

  it("formats no_checkin copy", () => {
    const out = formatEliminationReason({ code: "no_checkin", day: 2 });
    expect(out?.body).toContain("Day 2");
  });
});
