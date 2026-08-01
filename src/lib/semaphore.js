import { encodeAbiParameters, keccak256, stringToHex } from "viem";

export const SEMAPHORE_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function hashToField(value) {
  return BigInt(keccak256(value)) % SEMAPHORE_SCALAR_FIELD;
}

export function semaphoreScopeToField(scopeLabel) {
  if (typeof scopeLabel !== "string" || scopeLabel.length === 0) throw new Error("scope_label_required");
  return hashToField(stringToHex(scopeLabel));
}

export function semaphoreVoteCommitment({ scopeLabel, vote, salt }) {
  if (vote !== "real" && vote !== "fake") throw new Error("invalid_vote");
  if (!/^0x[0-9a-fA-F]{64}$/.test(salt || "")) throw new Error("invalid_salt");
  return hashToField(encodeAbiParameters(
    [{ type: "string" }, { type: "uint8" }, { type: "bytes32" }],
    [scopeLabel, vote === "real" ? 1 : 0, salt],
  ));
}
