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
 *
 * The actual transaction is signed by the server's hot wallet
 * (PRIZE_POOL_SIGNING_KEY) and broadcast — never by ARIA itself.
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
 * Register ARIA on the ERC-8004 registry. In production this would
 * POST to 8004scan.io; here we generate the registration payload and
 * return what would be sent.
 */
export async function ariaRegisterAgent() {
  if (!AGENT_SIGNING_KEY) {
    return {
      ok: false,
      reason: "no_agent_key_configured",
      agentDid: AGENT_DID,
    };
  }

  // The registration payload
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

  return {
    ok: true,
    registry: AGENT_REGISTRY,
    payload,
    note: "In production, this payload is signed with AGENT_SIGNING_KEY and POSTed to the registry. The agentDid + signature are recorded onchain.",
  };
}

export default {
  getAgentDid,
  getAgentHandle,
  ariaVerifyPhoto,
  ariaBuildPayoutTx,
  ariaSuggestNextRound,
  ariaBuildX402Request,
  ariaRegisterAgent,
};
