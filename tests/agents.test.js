// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  maxAgentSlots,
  humanSlots,
  agentSeatSummary,
  isValidAgentTier,
} from "../server/lib/agents.js";

describe("maxAgentSlots", () => {
  it("returns 0 when disabled", () => {
    expect(maxAgentSlots({ cohortSize: 50, enabled: false })).toBe(0);
  });

  it("uses 20–30% sweet spot for a 50-person cohort", () => {
    expect(
      maxAgentSlots({
        cohortSize: 50,
        maxAgentRatio: 0.25,
        minAgentCount: 5,
        enabled: true,
      }),
    ).toBe(13); // ceil(50 * 0.25)
  });

  it("respects minAgentCount on small cohorts", () => {
    expect(
      maxAgentSlots({
        cohortSize: 20,
        maxAgentRatio: 0.25,
        minAgentCount: 5,
        enabled: true,
      }),
    ).toBe(5);
  });

  it("hard-caps at 35% so humans stay the majority", () => {
    expect(
      maxAgentSlots({
        cohortSize: 50,
        maxAgentRatio: 0.5,
        minAgentCount: 5,
        enabled: true,
      }),
    ).toBe(17); // floor(50 * 0.35)
  });
});

describe("humanSlots", () => {
  it("subtracts reserved agent seats from cohort size", () => {
    expect(humanSlots({ cohortSize: 50, maxAgentSlots: 13 })).toBe(37);
  });
});

describe("agentSeatSummary", () => {
  it("reports fill state and remaining seats", () => {
    const summary = agentSeatSummary({
      cohortSize: 50,
      maxAgentRatio: 0.25,
      minAgentCount: 5,
      enabled: true,
      humanCount: 30,
      agentCount: 10,
    });
    expect(summary.maxSlots).toBe(13);
    expect(summary.humanSlots).toBe(37);
    expect(summary.humansFull).toBe(false);
    expect(summary.agentsFull).toBe(false);
    expect(summary.slotsRemaining).toEqual({ humans: 7, agents: 3 });
  });

  it("treats agents as full when feature is disabled", () => {
    const summary = agentSeatSummary({
      cohortSize: 50,
      enabled: false,
      humanCount: 50,
      agentCount: 0,
    });
    expect(summary.maxSlots).toBe(0);
    expect(summary.humanSlots).toBe(50);
    expect(summary.humansFull).toBe(true);
    expect(summary.agentsFull).toBe(true);
  });
});

describe("isValidAgentTier", () => {
  it("accepts basic/standard/premium", () => {
    expect(isValidAgentTier("basic")).toBe(true);
    expect(isValidAgentTier("standard")).toBe(true);
    expect(isValidAgentTier("premium")).toBe(true);
    expect(isValidAgentTier("ultra")).toBe(false);
  });
});
