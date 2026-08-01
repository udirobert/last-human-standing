/**
 * Semaphore technical spike for Last Human Standing.
 *
 * This intentionally uses ephemeral identities: it proves the SDK path only.
 * It does not enroll a real World ID or Self user, persist an identity, call a
 * contract, or change production voting.
 */
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof, verifyProof } from "@semaphore-protocol/proof";
import { keccak256, stringToHex } from "viem";

const ROUND_SCOPE_LABEL = "lhs:audit:cohort-demo:round-1:submission-7";
// Semaphore accepts a 32-byte string or a field value. Hashing the descriptive
// label keeps scopes unbounded while binding the exact audit context.
const ROUND_SCOPE = BigInt(keccak256(stringToHex(ROUND_SCOPE_LABEL)));
const HUMAN_VOTE = 1;

async function main() {
  // Semaphore recommends groups with more than two members for anonymity.
  const voter = new Identity();
  const decoys = [new Identity(), new Identity(), new Identity(), new Identity()];
  const group = new Group([voter.commitment, ...decoys.map((identity) => identity.commitment)]);

  const proof = await generateProof(voter, group, HUMAN_VOTE, ROUND_SCOPE);
  const valid = await verifyProof(proof);
  if (!valid) throw new Error("Semaphore proof did not verify");

  // The nullifier is deterministic for the identity + scope. A production
  // contract stores it once per scope to enforce one anonymous vote.
  console.log(JSON.stringify({
    valid,
    groupSize: group.size,
    groupDepth: group.depth,
    merkleTreeRoot: proof.merkleTreeRoot,
    scopeLabel: ROUND_SCOPE_LABEL,
    scope: proof.scope,
    nullifier: proof.nullifier,
    message: proof.message,
    note: "Proof verified without exposing a voter identity. The message is public; do not use this alone for a secret ballot.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
