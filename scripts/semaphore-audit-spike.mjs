/**
 * Stage-two Semaphore prototype: anonymous proof + hidden vote commitment.
 * It asserts a valid first signal, then verifies replay and scope rejection.
 */
import { randomBytes } from "node:crypto";
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";
import {
  createSemaphoreAuditVerifier,
  scopeToField,
  voteCommitmentToField,
} from "../server/lib/semaphoreAudit.js";

const scopeLabel = "lhs:audit:cohort-demo:round-1:submission-7";
const salt = `0x${randomBytes(32).toString("hex")}`;

async function main() {
  const voter = new Identity();
  const decoys = [new Identity(), new Identity(), new Identity(), new Identity()];
  const group = new Group([voter.commitment, ...decoys.map((identity) => identity.commitment)]);
  const commitment = voteCommitmentToField({ scopeLabel, vote: "real", salt });
  const proof = await generateProof(voter, group, commitment, scopeToField(scopeLabel));
  const verifier = createSemaphoreAuditVerifier();

  const first = await verifier.verifyCommitment({ proof, scopeLabel, commitment });
  if (!first.ok) throw new Error(`first_signal_rejected:${first.reason}`);

  const replay = await verifier.verifyCommitment({ proof, scopeLabel, commitment });
  if (replay.ok || replay.reason !== "nullifier_already_used") throw new Error("replay_was_not_rejected");

  const wrongScope = await verifier.verifyCommitment({ proof, scopeLabel: `${scopeLabel}:other`, commitment });
  if (wrongScope.ok || wrongScope.reason !== "scope_mismatch") throw new Error("wrong_scope_was_not_rejected");

  console.log(JSON.stringify({
    firstSignalAccepted: first.ok,
    replayRejected: replay.reason,
    wrongScopeRejected: wrongScope.reason,
    groupSize: group.size,
    commitment: commitment.toString(),
    nullifier: first.nullifier,
    note: "The verifier receives a vote commitment, not HUMAN/SUS or a voter identity.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
