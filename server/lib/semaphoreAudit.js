/**
 * Privacy-preserving audit primitives for the Semaphore prototype.
 *
 * This module intentionally has no database or Express dependency. A
 * production adapter must persist used nullifiers atomically by cohort scope.
 */
import { verifyProof } from "@semaphore-protocol/proof";
import { semaphoreScopeToField, semaphoreVoteCommitment } from "../../src/lib/semaphore.js";

/** Converts a descriptive audit scope into the Semaphore field representation. */
export function scopeToField(scopeLabel) {
  return semaphoreScopeToField(scopeLabel);
}

/**
 * Produces the public Semaphore message for a private HUMAN/SUS commitment.
 * `salt` must be a fresh 32-byte hex value generated and retained by the voter.
 */
export function voteCommitmentToField({ scopeLabel, vote, salt }) {
  return semaphoreVoteCommitment({ scopeLabel, vote, salt });
}

/**
 * Creates an in-memory verifier for the technical spike.
 * A repeated nullifier means the same anonymous identity has already signaled
 * in that exact scope; the verifier never receives the voter identity.
 */
export function createSemaphoreAuditVerifier() {
  const usedNullifiers = new Set();

  return {
    async verifyCommitment({ proof, scopeLabel, commitment, groupRoot }) {
      const expectedScope = scopeToField(scopeLabel).toString();
      if (String(proof?.scope) !== expectedScope) return { ok: false, reason: "scope_mismatch" };
      if (String(proof?.message) !== BigInt(commitment).toString()) return { ok: false, reason: "commitment_mismatch" };
      if (groupRoot != null && String(proof?.merkleTreeRoot) !== String(groupRoot)) return { ok: false, reason: "group_root_mismatch" };

      const valid = await verifyProof(proof);
      if (!valid) return { ok: false, reason: "invalid_proof" };

      const nullifier = String(proof.nullifier);
      if (usedNullifiers.has(nullifier)) return { ok: false, reason: "nullifier_already_used" };
      usedNullifiers.add(nullifier);
      return { ok: true, nullifier };
    },
  };
}
