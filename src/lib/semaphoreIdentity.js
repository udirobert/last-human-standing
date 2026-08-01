import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { semaphoreScopeToField, semaphoreVoteCommitment } from "./semaphore.js";

const IDENTITY_STORAGE_KEY = "lhs:semaphore-identity:v1";

/** A browser-held identity. Never send its exported private key to the API. */
export function getOrCreateSemaphoreIdentity() {
  const stored = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
  if (stored) return Identity.import(stored);
  const identity = new Identity();
  window.localStorage.setItem(IDENTITY_STORAGE_KEY, identity.export());
  return identity;
}

export function getSemaphoreIdentityCommitment() {
  return getOrCreateSemaphoreIdentity().commitment.toString();
}

export async function createSemaphoreVoteProof({ members, scopeLabel, vote }) {
  const identity = getOrCreateSemaphoreIdentity();
  const group = new Group(members.map((member) => BigInt(member)));
  const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const commitment = semaphoreVoteCommitment({ scopeLabel, vote, salt });
  const proof = await generateProof(identity, group, commitment, semaphoreScopeToField(scopeLabel));
  return { proof, commitment: commitment.toString(), salt };
}
