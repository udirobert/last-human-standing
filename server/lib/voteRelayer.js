import { createPublicClient, createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
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

function enqueueVote(submissionId, voterAddress, vote) {
  const dir = resolve(__dirname, "../../.relayer");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `queue.json`);
  let queue = [];
  try { queue = JSON.parse(readFileSync(path, "utf8")); } catch { /* fresh queue */ }
  queue.push({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 8), submissionId, voterAddress, vote, ts: new Date().toISOString() });
  writeFileSync(path, JSON.stringify(queue, null, 2));
}

function dequeueBatch(count) {
  const dir = resolve(__dirname, "../../.relayer");
  const path = resolve(dir, `queue.json`);
  if (!existsSync(path)) return [];
  try {
    const queue = JSON.parse(readFileSync(path, "utf8"));
    const batch = queue.slice(0, count);
    const remaining = queue.slice(count);
    writeFileSync(path, JSON.stringify(remaining, null, 2));
    return batch;
  } catch {
    return [];
  }
}

function getQueueSize() {
  const path = resolve(__dirname, "../../.relayer/queue.json");
  try { return JSON.parse(readFileSync(path, "utf8")).length; } catch { return 0; }
}

export function startVoteRelayer({ log }) {
  if (!VOTE_REGISTRY_ADDRESS || !CELO_SIGNING_KEY || !abi) {
    log("vote_relayer_offline", {
      reason: !VOTE_REGISTRY_ADDRESS ? "no_contract_address" : !CELO_SIGNING_KEY ? "no_signing_key" : "no_abi",
    });
    return;
  }

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
      const batch = dequeueBatch(BATCH_SIZE);
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
            args: [BigInt(v.submissionId), v.voterAddress, v.vote === "real"],
          });
          log("vote_relayer_tx", { id: v.id, hash, submissionId: v.submissionId });
          await new Promise((r) => setTimeout(r, 100));
        } catch (err) {
          log("vote_relayer_tx_failed", {
            id: v.id,
            error: err instanceof Error ? err.message : "unknown",
          });
        }
      }

      const remaining = getQueueSize();
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

export { enqueueVote };
