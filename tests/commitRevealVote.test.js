import { describe, it, expect, beforeEach } from "vitest";
import {
  commitmentFor,
  randomSalt,
  saltFromLabel,
  voteToIsHuman,
} from "../src/lib/commitRevealVote.js";
import {
  saveCommitBallot,
  getCommitBallot,
  markBallotRevealed,
  clearCommitBallot,
  listPendingReveals,
} from "../src/lib/commitRevealStore.js";

const REGISTRY = "0x1111111111111111111111111111111111111111";
const VOTER = "0x0000000000000000000000000000000000000b0b";
const CHAIN_ID = 42220;

describe("commitRevealVote", () => {
  it("maps real/fake to isHuman", () => {
    expect(voteToIsHuman("real")).toBe(true);
    expect(voteToIsHuman("fake")).toBe(false);
    expect(() => voteToIsHuman("maybe")).toThrow(/invalid_vote/);
  });

  it("produces a stable 32-byte commitment for fixed inputs", () => {
    const salt = saltFromLabel("local-randomness");
    const a = commitmentFor({
      registry: REGISTRY,
      chainId: CHAIN_ID,
      roundId: 1,
      submissionId: 7,
      voter: VOTER,
      vote: "real",
      salt,
    });
    const b = commitmentFor({
      registry: REGISTRY,
      chainId: CHAIN_ID,
      roundId: 1,
      submissionId: 7,
      voter: VOTER,
      vote: "real",
      salt,
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("changes when vote, salt, voter, or chain differs", () => {
    const salt = saltFromLabel("local-randomness");
    const base = {
      registry: REGISTRY,
      chainId: CHAIN_ID,
      roundId: 1,
      submissionId: 7,
      voter: VOTER,
      vote: "real",
      salt,
    };
    const human = commitmentFor(base);
    expect(commitmentFor({ ...base, vote: "fake" })).not.toBe(human);
    expect(commitmentFor({ ...base, salt: saltFromLabel("other") })).not.toBe(human);
    expect(commitmentFor({ ...base, voter: "0x0000000000000000000000000000000000000b0c" })).not.toBe(human);
    expect(commitmentFor({ ...base, chainId: 1 })).not.toBe(human);
  });

  it("randomSalt returns 32 random bytes", () => {
    const a = randomSalt();
    const b = randomSalt();
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    expect(b).toMatch(/^0x[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("commitRevealStore", () => {
  const keyArgs = {
    cohort: 1,
    roundId: 2,
    submissionId: 9,
    voter: VOTER,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a ballot and lists pending reveals", () => {
    const salt = randomSalt();
    const commitment = commitmentFor({
      registry: REGISTRY,
      chainId: CHAIN_ID,
      roundId: keyArgs.roundId,
      submissionId: keyArgs.submissionId,
      voter: VOTER,
      vote: "fake",
      salt,
    });
    saveCommitBallot({
      ...keyArgs,
      vote: "fake",
      salt,
      commitment,
    });
    const loaded = getCommitBallot(keyArgs);
    expect(loaded?.vote).toBe("fake");
    expect(loaded?.salt).toBe(salt);
    expect(loaded?.commitment).toBe(commitment);
    expect(loaded?.status).toBe("committed");

    expect(listPendingReveals({ cohort: 1, roundId: 2, voter: VOTER })).toHaveLength(1);
    markBallotRevealed(keyArgs);
    expect(listPendingReveals({ cohort: 1, roundId: 2, voter: VOTER })).toHaveLength(0);
    expect(getCommitBallot(keyArgs)?.status).toBe("revealed");

    clearCommitBallot(keyArgs);
    expect(getCommitBallot(keyArgs)).toBeNull();
  });
});
