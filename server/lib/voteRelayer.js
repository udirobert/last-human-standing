import { createWalletClient, http } from "viem";
import { celo, worldchain } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_SIGNING_KEY = process.env.CELO_SIGNING_KEY;
const VOTE_REGISTRY_ADDRESS = process.env.VOTE_REGISTRY_ADDRESS;
const COMMIT_REVEAL_REGISTRY_ADDRESS = process.env.COMMIT_REVEAL_REGISTRY_ADDRESS;
const COMMIT_REVEAL_CHAIN_ID = Number(process.env.COMMIT_REVEAL_CHAIN_ID || 42220);
const BATCH_SIZE = Number(process.env.VOTE_BATCH_SIZE || 1);
const POLL_INTERVAL = Number(process.env.VOTE_POLL_INTERVAL || 15_000);

let legacyAbi = null;
let commitRevealAbi = null;
try {
  const artifact = JSON.parse(
    readFileSync(resolve(__dirname, "../../contracts/VoteRegistry.json"), "utf8"),
  );
  legacyAbi = artifact.abi;
} catch {
  // No ABI available — relayer will skip legacy onchain mode
}
try {
  const artifact = JSON.parse(
    readFileSync(resolve(__dirname, "../../contracts/CommitRevealVoteRegistry.json"), "utf8"),
  );
  commitRevealAbi = artifact.abi;
} catch {
  // Optional until compiled
}

let _supabaseAdmin = null;

/**
 * Set the Supabase admin client for DB-backed queue operations.
 * Called during server startup (import side-effect free by default).
 */
export function setRelayerSupabase(supabase) {
  _supabaseAdmin = supabase;
}

/**
 * Enqueue a vote for onchain submission via the vote_queue table.
 * Crash-safe: vote and queue insert can be done atomically by the caller.
 * Returns a promise that resolves when the row is inserted.
 */
export async function enqueueVote(submissionId, voterAddress, vote, supabaseClient) {
  const db = supabaseClient || _supabaseAdmin;
  if (!db) {
    // No Supabase configured — silently skip onchain queueing.
    // This is expected in dev/test mode or when Supabase is down.
    return;
  }
  const { error } = await db.from("vote_queue").insert({
    submission_id: submissionId,
    voter_address: voterAddress,
    vote,
    status: "pending",
    job_type: "legacy",
  });
  if (error) {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      event: "vote_enqueue_error",
      error: error.message,
    }));
  }
}

async function claimBatch(count) {
  // Atomically claim N pending rows using a subquery + update.
  // This avoids race conditions between multiple relayer instances.
  const { data, error } = await _supabaseAdmin.rpc("claim_vote_queue_batch", {
    p_batch_size: count,
  });
  if (error) {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      event: "vote_claim_error",
      error: error.message,
    }));
    return [];
  }
  return data || [];
}

async function markDone(id, txHash) {
  await _supabaseAdmin
    .from("vote_queue")
    .update({ status: "done", tx_hash: txHash, processed_at: new Date().toISOString() })
    .eq("id", id);
}

async function markFailed(id, errorMessage) {
  await _supabaseAdmin
    .from("vote_queue")
    .update({ status: "failed", error_message: String(errorMessage).slice(0, 500), processed_at: new Date().toISOString() })
    .eq("id", id);
}

async function getQueueSize() {
  const { count } = await _supabaseAdmin
    .from("vote_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

function resolveCommitRevealChain() {
  if (COMMIT_REVEAL_CHAIN_ID === worldchain.id) return worldchain;
  return celo;
}

export function startVoteRelayer({ log, supabaseAdmin }) {
  const hasLegacy = Boolean(VOTE_REGISTRY_ADDRESS && CELO_SIGNING_KEY && legacyAbi);
  const hasCommitReveal = Boolean(COMMIT_REVEAL_REGISTRY_ADDRESS && CELO_SIGNING_KEY && commitRevealAbi);

  if (!hasLegacy && !hasCommitReveal) {
    log("vote_relayer_offline", {
      reason: !CELO_SIGNING_KEY
        ? "no_signing_key"
        : !VOTE_REGISTRY_ADDRESS && !COMMIT_REVEAL_REGISTRY_ADDRESS
          ? "no_contract_address"
          : "no_abi",
    });
    return;
  }

  if (!supabaseAdmin) {
    log("vote_relayer_offline", { reason: "no_supabase" });
    return;
  }

  _supabaseAdmin = supabaseAdmin;

  const account = privateKeyToAccount(CELO_SIGNING_KEY);
  const legacyClient = hasLegacy
    ? createWalletClient({ account, chain: celo, transport: http(CELO_RPC) })
    : null;
  const crChain = resolveCommitRevealChain();
  const crRpc = process.env.COMMIT_REVEAL_RPC || CELO_RPC;
  const commitRevealClient = hasCommitReveal
    ? createWalletClient({ account, chain: crChain, transport: http(crRpc) })
    : null;

  log("vote_relayer_started", {
    address: account.address,
    legacyContract: VOTE_REGISTRY_ADDRESS || null,
    commitRevealContract: COMMIT_REVEAL_REGISTRY_ADDRESS || null,
    batchSize: BATCH_SIZE,
  });

  let running = false;

  async function processQueue() {
    if (running) return;
    running = true;

    try {
      const batch = await claimBatch(BATCH_SIZE);
      if (!batch.length) {
        running = false;
        return;
      }

      log("vote_relayer_batch", { count: batch.length });

      for (const v of batch) {
        try {
          const jobType = v.job_type || "legacy";
          let hash;

          if (jobType === "commit") {
            if (!commitRevealClient || !COMMIT_REVEAL_REGISTRY_ADDRESS) {
              throw new Error("commit_reveal_relayer_unavailable");
            }
            hash = await commitRevealClient.writeContract({
              address: COMMIT_REVEAL_REGISTRY_ADDRESS,
              abi: commitRevealAbi,
              functionName: "commitRelayerVote",
              args: [
                BigInt(v.round_id),
                BigInt(v.submission_id),
                v.voter_address,
                v.commitment,
              ],
            });
          } else if (jobType === "reveal") {
            if (!commitRevealClient || !COMMIT_REVEAL_REGISTRY_ADDRESS) {
              throw new Error("commit_reveal_relayer_unavailable");
            }
            hash = await commitRevealClient.writeContract({
              address: COMMIT_REVEAL_REGISTRY_ADDRESS,
              abi: commitRevealAbi,
              functionName: "revealRelayerVote",
              args: [
                BigInt(v.round_id),
                BigInt(v.submission_id),
                v.voter_address,
                v.vote === "real",
                v.salt,
              ],
            });
          } else {
            if (!legacyClient || !VOTE_REGISTRY_ADDRESS) {
              throw new Error("legacy_relayer_unavailable");
            }
            hash = await legacyClient.writeContract({
              address: VOTE_REGISTRY_ADDRESS,
              abi: legacyAbi,
              functionName: "castRelayerVote",
              args: [BigInt(v.submission_id), v.voter_address, v.vote === "real"],
            });
          }

          log("vote_relayer_tx", { id: v.id, hash, submissionId: v.submission_id, jobType });
          await markDone(v.id, hash);
          await new Promise((r) => setTimeout(r, 100));
        } catch (err) {
          log("vote_relayer_tx_failed", {
            id: v.id,
            error: err instanceof Error ? err.message : "unknown",
          });
          await markFailed(v.id, err instanceof Error ? err.message : "unknown");
        }
      }

      const remaining = await getQueueSize();
      if (remaining > 0) log("vote_relayer_queue_remaining", { count: remaining });
    } catch (err) {
      log("vote_relayer_error", { error: err instanceof Error ? err.message : "unknown" });
    } finally {
      running = false;
    }
  }

  const interval = setInterval(processQueue, POLL_INTERVAL);
  setTimeout(processQueue, 5000);

  return () => clearInterval(interval);
}
