import { encodeAbiParameters, keccak256, toBytes } from "viem";

/**
 * Commitment preimage matching CommitRevealVoteRegistry.commitmentFor:
 * keccak256(abi.encode(registry, chainId, roundId, submissionId, voter, isHuman, salt))
 */

export function randomSalt() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function voteToIsHuman(vote) {
  if (vote === "real") return true;
  if (vote === "fake") return false;
  throw new Error("invalid_vote");
}

export function commitmentFor({
  registry,
  chainId,
  roundId,
  submissionId,
  voter,
  vote,
  salt,
}) {
  if (!registry || !/^0x[a-fA-F0-9]{40}$/.test(registry)) throw new Error("invalid_registry");
  if (!Number.isFinite(Number(chainId))) throw new Error("invalid_chain_id");
  if (!Number.isFinite(Number(roundId)) || Number(roundId) < 1) throw new Error("invalid_round_id");
  if (!Number.isFinite(Number(submissionId)) || Number(submissionId) < 1) throw new Error("invalid_submission_id");
  if (!voter || !/^0x[a-fA-F0-9]{40}$/.test(voter)) throw new Error("invalid_voter");
  if (!/^0x[0-9a-fA-F]{64}$/.test(salt || "")) throw new Error("invalid_salt");

  const isHuman = voteToIsHuman(vote);
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "address" },
        { type: "bool" },
        { type: "bytes32" },
      ],
      [
        registry,
        BigInt(chainId),
        BigInt(roundId),
        BigInt(submissionId),
        voter,
        isHuman,
        salt,
      ],
    ),
  );
}

/** Deterministic salt helper for fixtures (mirrors keccak256(bytes("…")) in Solidity tests). */
export function saltFromLabel(label) {
  return keccak256(toBytes(label));
}
