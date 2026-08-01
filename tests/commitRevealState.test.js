import { describe, it, expect } from "vitest";
import { buildCommitRevealState } from "../server/lib/commitReveal.js";

const envOn = {
  COMMIT_REVEAL_VOTING_ENABLED: "true",
  COMMIT_REVEAL_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
  COMMIT_REVEAL_CHAIN_ID: "42220",
};

describe("buildCommitRevealState", () => {
  it("returns disabled when flag is off", () => {
    expect(buildCommitRevealState({ closes_at: "2030-01-01T00:00:00Z" }, {
      env: { COMMIT_REVEAL_VOTING_ENABLED: "false" },
    })).toEqual({ enabled: false });
  });

  it("is commit before commit_deadline", () => {
    const state = buildCommitRevealState(
      {
        commit_deadline: "2030-01-02T00:00:00Z",
        reveal_deadline: "2030-01-03T00:00:00Z",
      },
      { now: Date.parse("2030-01-01T12:00:00Z"), env: envOn },
    );
    expect(state.enabled).toBe(true);
    expect(state.phase).toBe("commit");
    expect(state.registry).toBe(envOn.COMMIT_REVEAL_REGISTRY_ADDRESS);
  });

  it("is reveal between deadlines", () => {
    const state = buildCommitRevealState(
      {
        commit_deadline: "2030-01-01T00:00:00Z",
        reveal_deadline: "2030-01-03T00:00:00Z",
      },
      { now: Date.parse("2030-01-02T00:00:00Z"), env: envOn },
    );
    expect(state.phase).toBe("reveal");
  });

  it("falls back to closes_at as commit deadline", () => {
    const state = buildCommitRevealState(
      { closes_at: "2030-06-01T00:00:00Z" },
      { now: Date.parse("2030-05-01T00:00:00Z"), env: envOn },
    );
    expect(state.phase).toBe("commit");
    expect(state.commitDeadline).toBe("2030-06-01T00:00:00Z");
  });
});
