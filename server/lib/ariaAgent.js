/**
 * ARIA — onchain agent service for Last Human Standing.
 *
 * Wraps the ARIA personality system with onchain economic agency:
 *  - ERC-8004 agent identity (registered on 8004scan)
 *  - x402 payment-protocol support for sponsored rounds
 *  - Autonomous actions: verify check-ins, vote on submissions, trigger payouts
 *
 * Design: ARIA is an *autonomous* agent that can act on behalf of the
 * protocol — verifying photos, flagging cheaters, and (with admin sign-off)
 * distributing the prize pool to the final survivor.
 */

import crypto from "crypto";

const AGENT_DID = process.env.ARIA_AGENT_DID || "did:erc8004:last-human-standing:aria";
const AGENT_SIGNING_KEY = process.env.ARIA_AGENT_KEY || null;
const AGENT_REGISTRY = process.env.ERC8004_REGISTRY || "https://8004scan.io/api/v1/agents";

/**
 * Generate an ERC-8004-style agentId from the agent's identity and intent.
 * Real registration would post to 8004scan; here we produce a deterministic
 * off-chain handle so the agent can be referenced consistently.
 */
export function getAgentDid() {
  return AGENT_DID;
}

export function getAgentHandle() {
  return "aria-lhs-v1";
}

/**
 * ARIA's three "agents" — each is an autonomous function that returns
 * a structured action which the caller can either execute automatically
 * or surface to the user for confirmation.
 */

// ── Agent 1: Photo Verifier ───────────────────────────────────────────

/**
 * Auto-verify a check-in photo.
 * Returns { action, confidence, reason, suggested_vote }.
 * In a real deployment this would call a vision model; here it uses
 * heuristics (file size, mime type, dimensions) as a placeholder.
 */
export async function ariaVerifyPhoto({ mediaPath, mimeType, sizeBytes, dimensions }) {
  if (!mediaPath) {
    return {
      action: "reject",
      confidence: 0.99,
      reason: "no_photo_provided",
      suggested_vote: "sus",
    };
  }

  // Heuristic 1: suspiciously small files are likely placeholders
  if (sizeBytes && sizeBytes < 5_000) {
    return {
      action: "flag",
      confidence: 0.6,
      reason: "file_too_small",
      suggested_vote: "sus",
    };
  }

  // Heuristic 2: missing mime type or non-image
  if (mimeType && !mimeType.startsWith("image/")) {
    return {
      action: "flag",
      confidence: 0.7,
      reason: "invalid_mime",
      suggested_vote: "sus",
    };
  }

  // Default: trust the crowd
  return {
    action: "defer_to_crowd",
    confidence: 0.5,
    reason: "no_strong_signal",
    suggested_vote: null,
  };
}

// ── Agent 2: Prize Pool Distributor ──────────────────────────────────

/**
 * Build the onchain transaction for paying the final survivor.
 * Returns { to, value, data, chain, token, amount }.
 */
export async function ariaBuildPayoutTx({ winnerAddress, amountUsd, token = "cUSD", chain = "celo" }) {
  if (!winnerAddress) throw new Error("winner_address_required");
  if (!winnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error("invalid_winner_address");
  }

  const tokenInfo = {
    cUSD: { address: "0x765DE816845861e75A25fCA122bb6898E8B2a1cF", decimals: 18, chain: "celo" },
    USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6, chain: "celo" },
  }[token];

  if (!tokenInfo) throw new Error(`unsupported_payout_token_${token}`);

  // Build the ERC-20 transfer calldata
  const amountWei = BigInt(Math.floor(amountUsd * 10 ** tokenInfo.decimals));
  const data =
    "0xa9059cbb" +
    winnerAddress.toLowerCase().replace("0x", "").padStart(64, "0") +
    amountWei.toString(16).padStart(64, "0");

  return {
    to: tokenInfo.address,
    value: "0x0",
    data,
    chain: tokenInfo.chain,
    token,
    amountUsd,
    agentDid: AGENT_DID,
  };
}

const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_PRIZE_POOL_KEY = process.env.CELO_PRIZE_POOL_PRIVATE_KEY || process.env.PRIZE_POOL_SIGNING_KEY || null;
const CELO_PRIZE_POOL_ADDRESS = process.env.VITE_CELO_PRIZE_POOL_ADDRESS || null;

/**
 * Sign and broadcast an ERC-20 payout transaction on Celo.
 * This is the agent's autonomous onchain action — called after the game ends.
 * Returns { txHash, explorerUrl } on success.
 */
export async function ariaBroadcastPayoutTx({ winnerAddress, amountUsd, token = "cUSD" }) {
  if (!CELO_PRIZE_POOL_KEY) {
    return { ok: false, reason: "no_prize_pool_key" };
  }
  if (!CELO_PRIZE_POOL_ADDRESS) {
    return { ok: false, reason: "no_prize_pool_address" };
  }

  const tx = await ariaBuildPayoutTx({ winnerAddress, amountUsd, token });

  try {
    // 1) Get nonce
    const nonceResp = await fetch(CELO_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_getTransactionCount",
        params: [CELO_PRIZE_POOL_ADDRESS, "pending"],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const nonceJson = await nonceResp.json();
    const nonce = nonceJson.result || "0x0";

    // 2) Get gas price
    const gasResp = await fetch(CELO_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
      signal: AbortSignal.timeout(8000),
    });
    const gasJson = await gasResp.json();
    const gasPrice = gasJson.result || "0x";
    const gasLimit = "0x30d40"; // 200k — ample for ERC-20 transfer

    // 3) Build the raw tx
    const rawTx = {
      from: CELO_PRIZE_POOL_ADDRESS,
      to: tx.to,
      nonce,
      gasPrice,
      gas: gasLimit,
      value: "0x0",
      data: tx.data,
      chainId: "0xa4ec", // 42220 = Celo mainnet
    };

    // 4) Sign via eth_sendTransaction using the private key
    // This requires importing viem for proper signing
    const { createWalletClient, http } = await import("viem");
    const { celo } = await import("viem/chains");
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(CELO_PRIZE_POOL_KEY.startsWith("0x") ? CELO_PRIZE_POOL_KEY : `0x${CELO_PRIZE_POOL_KEY}`);

    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(CELO_RPC),
    });

    const txHash = await walletClient.sendTransaction({
      to: rawTx.to,
      value: BigInt(0),
      data: rawTx.data,
      gasPrice: BigInt(gasPrice),
      gas: BigInt(gasLimit),
      chainId: 42220,
    });

    return {
      ok: true,
      txHash,
      explorerUrl: `https://celoscan.io/tx/${txHash}`,
      chain: "celo",
      token,
      amountUsd,
      winnerAddress,
      agentDid: AGENT_DID,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `broadcast_error: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

// ── Agent 3: Round Manager ───────────────────────────────────────────

/**
 * ARIA's recommendations for the next round: theme, prompt, duration,
 * survival cap, GPS pin (optional). This is the *suggestion* — admins
 * still confirm via /api/admin/round.
 */
export async function ariaSuggestNextRound({ day, previousThemes = [] }) {
  // Pick a theme that hasn't been used in the last 5 days
  const themes = [
    "AT A CAFÉ", "AT A PARK", "AT A GYM", "WITH A FRIEND",
    "OUTSIDE AT SUNRISE", "AT A BOOKSTORE", "EATING SOMETHING",
    "ON PUBLIC TRANSIT", "AT A GROCERY STORE", "AT A BEACH OR WATER",
  ];
  const freshThemes = themes.filter((t) => !previousThemes.slice(-5).includes(t));
  const theme = freshThemes[Math.floor(Math.random() * freshThemes.length)] || themes[0];

  // Cap shrinks daily
  const survivalCap = Math.max(1, Math.ceil(50 / 2 ** (day - 1)));

  return {
    day,
    theme,
    place_type: theme,
    prompt: `Show us your ${theme.toLowerCase()} — anywhere in the world.`,
    survival_cap: survivalCap,
    duration_hours: 4,
    gps_optional: true,
    agentDid: AGENT_DID,
  };
}

// ── x402 Payment Protocol ────────────────────────────────────────────

/**
 * Build an x402-compliant payment request. x402 is the protocol for
 * agent-to-agent microtransactions over HTTP 402 status codes.
 */
export function ariaBuildX402Request({ resource, amountUsd, token = "cUSD", recipientAddress }) {
  const challengeId = crypto.randomUUID();
  return {
    x402Version: 1,
    scheme: "exact",
    network: "celo",
    challengeId,
    resource,
    payTo: recipientAddress,
    maxAmountRequired: amountUsd.toString(),
    asset: token,
    description: `ARIA agent onchain action: ${resource}`,
    resourceTimeoutSeconds: 60,
  };
}

// ── ERC-8004 Agent Registration ─────────────────────────────────────

/**
 * Register ARIA on the ERC-8004 registry.
 * Signs the payload with AGENT_SIGNING_KEY and POSTs to 8004scan.io.
 */
export async function ariaRegisterAgent() {
  if (!AGENT_SIGNING_KEY) {
    return {
      ok: false,
      reason: "no_agent_key_configured",
      agentDid: AGENT_DID,
    };
  }

  const payload = {
    agentDid: AGENT_DID,
    handle: getAgentHandle(),
    description: "ARIA — autonomous onchain agent for Last Human Standing. Verifies check-ins, flags cheaters, and distributes prize pools.",
    services: [
      "photo_verification",
      "round_management",
      "prize_distribution",
    ],
    chains: ["celo"],
    wallet: process.env.ARIA_AGENT_WALLET || null,
  };

  // Sign the payload with the agent key
  const signature = crypto
    .createHmac("sha256", AGENT_SIGNING_KEY)
    .update(JSON.stringify(payload))
    .digest("hex");

  try {
    const resp = await fetch(AGENT_REGISTRY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, signature }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await resp.json().catch(() => null);

    if (resp.ok) {
      return { ok: true, registry: AGENT_REGISTRY, agentDid: AGENT_DID, result };
    }

    return {
      ok: false,
      reason: `registry_rejected: ${resp.status}`,
      agentDid: AGENT_DID,
      details: result,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `registry_error: ${e instanceof Error ? e.message : "unknown"}`,
      agentDid: AGENT_DID,
    };
  }
}

export default {
  getAgentDid,
  getAgentHandle,
  ariaVerifyPhoto,
  ariaBuildPayoutTx,
  ariaBroadcastPayoutTx,
  ariaSuggestNextRound,
  ariaBuildX402Request,
  ariaRegisterAgent,
};
