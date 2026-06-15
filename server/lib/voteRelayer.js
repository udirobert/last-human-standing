import { createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_SIGNING_KEY = process.env.CELO_SIGNING_KEY;
const VOTE_REGISTRY_ADDRESS = process.env.VOTE_REGISTRY_ADDRESS;
const BATCH_SIZE = Number(process.env.VOTE_BATCH_SIZE || 1);
const POLL_INTERVAL = Number(process.env.VOTE_POLL_INTERVAL || 15_000);

let abi = null;
try {
  const artifact = JSON.parse(
    readFileSync(resolve(__dirname, "../../contracts/VoteRegistry.json"), "utf8"),
  );
  abi = artifact.abi;
} catch {
  // No ABI available — relayer will skip onchain mode
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

export function startVoteRelayer({ log, supabaseAdmin }) {
  if (!VOTE_REGISTRY_ADDRESS || !CELO_SIGNING_KEY || !abi) {
    log("vote_relayer_offline", {
      reason: !VOTE_REGISTRY_ADDRESS ? "no_contract_address" : !CELO_SIGNING_KEY ? "no_signing_key" : "no_abi",
    });
    return;
  }

  if (!supabaseAdmin) {
    log("vote_relayer_offline", { reason: "no_supabase" });
    return;
  }

  _supabaseAdmin = supabaseAdmin;

  const account = privateKeyToAccount(CELO_SIGNING_KEY);
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(CELO_RPC),
  });

  log("vote_relayer_started", {
    address: account.address,
    contract: VOTE_REGISTRY_ADDRESS,
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
          const hash = await walletClient.writeContract({
            address: VOTE_REGISTRY_ADDRESS,
            abi,
            functionName: "castRelayerVote",
            args: [BigInt(v.submission_id), v.voter_address, v.vote === "real"],
          });
          log("vote_relayer_tx", { id: v.id, hash, submissionId: v.submission_id });
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
