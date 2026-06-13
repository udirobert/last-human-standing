import { Router } from "express";
import { rateLimit } from "../rateLimit.js";
import { ensureObjectBody, ensureString, sendValidationError } from "../lib/validators.js";

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df35b9bc";
const WLD_CONTRACT = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const WORLD_CHAIN_RPC = process.env.WORLD_CHAIN_RPC || "https://worldchain-mainnet.g.alchemy.com/public";
const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";
const CELO_ALFAJORES_RPC = process.env.CELO_ALFAJORES_RPC || "https://alfajores-forno.celo.org";

/**
 * Celo token contract addresses (mainnet).
 */
const CELO_TOKENS = {
  cUSD: "0x765DE816845861e75A25fCA122bb6898E8B2a1cF",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
};

/**
 * Verify an ERC-20 transfer on Celo (cUSD or USDC).
 * Returns { valid, reason }.
 */
async function verifyCeloTransfer(txHash, senderAddress, tokenSymbol, prizePoolAddress) {
  const tokenAddress = CELO_TOKENS[tokenSymbol];
  if (!tokenAddress) {
    return { valid: false, reason: `unsupported_token_${tokenSymbol}` };
  }

  const rpcUrl = process.env.USE_CELO_TESTNET === "true" ? CELO_ALFAJORES_RPC : CELO_RPC;

  try {
    const receiptResp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const receiptJson = await receiptResp.json();
    if (!receiptJson.result) return { valid: false, reason: "tx_not_found" };

    const receipt = receiptJson.result;
    if (receipt.status === "0x0") return { valid: false, reason: "tx_failed" };

    const toAddr = receipt.to?.toLowerCase();
    if (toAddr !== tokenAddress.toLowerCase()) {
      return { valid: false, reason: "wrong_contract", actualTo: receipt.to };
    }

    const transferTopic = ERC20_TRANSFER_TOPIC.toLowerCase();
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address?.toLowerCase() === tokenAddress.toLowerCase() &&
        log.topics?.[0]?.toLowerCase() === transferTopic,
    );
    if (transferLogs.length === 0) return { valid: false, reason: "no_transfer_event" };

    const normalizedSender = senderAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const normalizedRecipient = prizePoolAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const amountWei = BigInt(5) * BigInt(10 ** (tokenSymbol === "cUSD" ? 18 : 6));

    for (const log of transferLogs) {
      const fromRaw = log.topics[1];
      const toRaw = log.topics[2];
      const amountRaw = log.data === "0x0" ? "0x0" : log.data;
      const fromAddrLogged = fromRaw.replace("0x", "").toLowerCase();
      const toAddrLogged = toRaw.replace("0x", "").toLowerCase();
      const amount = BigInt(amountRaw);

      if (fromAddrLogged === normalizedSender && toAddrLogged === normalizedRecipient && amount >= amountWei) {
        return { valid: true, reason: "ok" };
      }
    }
    return { valid: false, reason: "amount_insufficient_or_wrong_recipient" };
  } catch (e) {
    return { valid: false, reason: `rpc_error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

/**
 * Verify a WLD ERC-20 transfer on World Chain.
 * Returns { valid, reason }.
 */
async function verifyWldTransfer(txHash, senderAddress, prizePoolAddress) {
  try {
    const receiptResp = await fetch(WORLD_CHAIN_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const receiptJson = await receiptResp.json();
    if (!receiptJson.result) return { valid: false, reason: "tx_not_found" };

    const receipt = receiptJson.result;
    if (receipt.status === "0x0") return { valid: false, reason: "tx_failed" };

    const toAddr = receipt.to?.toLowerCase();
    if (toAddr !== WLD_CONTRACT.toLowerCase()) {
      return { valid: false, reason: "wrong_contract", actualTo: receipt.to };
    }

    const transferTopic = ERC20_TRANSFER_TOPIC.toLowerCase();
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address?.toLowerCase() === WLD_CONTRACT.toLowerCase() &&
        log.topics?.[0]?.toLowerCase() === transferTopic,
    );
    if (transferLogs.length === 0) return { valid: false, reason: "no_transfer_event" };

    const normalizedSender = senderAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const normalizedRecipient = prizePoolAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const amountWei = BigInt(1) * BigInt(1e18);

    for (const log of transferLogs) {
      const fromRaw = log.topics[1];
      const toRaw = log.topics[2];
      const amountRaw = log.data === "0x" ? "0x0" : log.data;
      const fromAddrLogged = fromRaw.replace("0x", "").toLowerCase();
      const toAddrLogged = toRaw.replace("0x", "").toLowerCase();
      const amount = BigInt(amountRaw);

      if (fromAddrLogged === normalizedSender && toAddrLogged === normalizedRecipient && amount >= amountWei) {
        return { valid: true, reason: "ok" };
      }
    }
    return { valid: false, reason: "amount_insufficient_or_wrong_recipient" };
  } catch (e) {
    return { valid: false, reason: `rpc_error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

export default function paymentRoutes({
  requireAuth,
  supabaseAdmin,
  log,
  upsertPaidUser,
  createPayReferenceRecord,
  consumePayReferenceRecord,
  createSessionRecord,
  setSessionCookie,
  rateLimitStorage,
}) {
  const router = Router();

  // ---------- POST /api/pay/reference ----------
  router.post("/pay/reference", requireAuth, async (req, res) => {
    const reference = crypto.randomUUID();
    await createPayReferenceRecord(reference, req.user.address);
    res.json({ ok: true, reference });
  });

  // ---------- POST /api/pay/confirm (World App) ----------
  router.post("/pay/confirm", requireAuth, async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    const { payload } = body;
    if (!payload?.transactionId || !payload?.reference) {
      return res.status(400).json({ error: "missing_payment_payload" });
    }
    const ref = supabaseAdmin
      ? await consumePayReferenceRecord(payload.reference)
      : { address: req.user.address };
    if (!ref || ref.address.toLowerCase() !== req.user.address.toLowerCase()) {
      return res.status(400).json({ error: "invalid_payment_reference" });
    }

    const appId = process.env.WORLD_APP_ID;
    const apiKey = process.env.WORLD_DEV_PORTAL_API_KEY;
    if (!appId || !apiKey) return res.status(501).json({ error: "payments_not_configured" });

    try {
      const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transactionId}?app_id=${appId}&type=payment`;
      log("pay_confirm_fetch", { address: req.user.address, reference: payload.reference, txId: payload.transactionId });
      const resp = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        log("pay_confirm_rejected", { address: req.user.address, status: resp.status });
        return res.status(400).json({ error: "payment_verify_failed", details: json });
      }
      await upsertPaidUser(req.user.address, { referredBy: body.referredBy || null, platform: "world", entryKind: "paid", entryToken: "wld" });
      log("pay_confirm_success", { address: req.user.address, platform: "world" });
      res.json({ ok: true, paid: true, details: json });
    } catch (e) {
      log("pay_confirm_error", { address: req.user.address, message: e instanceof Error ? e.message : "unknown" });
      res.status(400).json({ error: "payment_confirm_failed", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  // ---------- POST /api/pay/browser-confirm (browser wallets) ----------
  router.post("/pay/browser-confirm",
    rateLimit({ keyFn: (req) => `browserpay:${req.ip}`, limit: 10, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const address = req.user?.address || ensureString(body.address, {
        field: "address", required: true, maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/,
      });
      // If user has a session, verify address matches
      if (req.user?.address && req.user.address.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ error: "address_mismatch" });
      }
      const txHash = ensureString(body.txHash, {
        field: "txHash", required: true, maxLength: 80, pattern: /^0x[a-fA-F0-9]{64}$/,
      });
      const referredBy = ensureString(body.referredBy, {
        field: "referredBy", required: false, maxLength: 64, pattern: /^LHS-[a-z0-9]+-[a-f0-9]+$/i,
      });

      const prizePoolAddress = process.env.VITE_PRIZE_POOL_ADDRESS;
      const verification = await verifyWldTransfer(txHash, address, prizePoolAddress);
      if (!verification.valid) {
        log("browser_pay_rejected", { address, txHash, reason: verification.reason });
        return res.status(400).json({ error: "tx_verification_failed", reason: verification.reason });
      }

      log("browser_pay_confirmed", { address, txHash });
      await upsertPaidUser(address, { referredBy, platform: "browser", entryKind: "paid", entryToken: "wld" });

      const sessionId = await createSessionRecord(address);
      setSessionCookie(res, sessionId);

      res.json({ ok: true, paid: true, address, txHash });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  // ---------- POST /api/pay/free-entry (hackathon campaign mode) ----------
  router.post("/pay/free-entry", requireAuth, async (req, res) => {
    if (process.env.FREE_ENTRY_MODE !== "true") {
      return res.status(501).json({ error: "free_entry_not_available" });
    }
    await upsertPaidUser(req.user.address, { platform: "free_entry", entryKind: "free" });
    log("free_entry", { address: req.user.address });
    res.json({ ok: true, paid: true, entryKind: "free" });
  });

  // ---------- POST /api/pay/browser-celo-confirm (Celo cUSD/USDC) ----------
  router.post("/pay/browser-celo-confirm",
    rateLimit({ keyFn: (req) => `celopay:${req.ip}`, limit: 10, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const address = req.user?.address || ensureString(body.address, {
        field: "address", required: true, maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/,
      });
      // If user has a session, verify address matches
      if (req.user?.address && req.user.address.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ error: "address_mismatch" });
      }
      const txHash = ensureString(body.txHash, {
        field: "txHash", required: true, maxLength: 80, pattern: /^0x[a-fA-F0-9]{64}$/,
      });
      const token = (ensureString(body.token, { field: "token", maxLength: 16 }) || "cUSD").toUpperCase();
      const referredBy = ensureString(body.referredBy, {
        field: "referredBy", required: false, maxLength: 64, pattern: /^LHS-[a-z0-9]+-[a-f0-9]+$/i,
      });

      const prizePoolAddress =
        process.env.VITE_CELO_PRIZE_POOL_ADDRESS || "0x0000000000000000000000000000000000000000";
      if (prizePoolAddress === "0x0000000000000000000000000000000000000000") {
        return res.status(501).json({ error: "celo_prize_pool_not_configured" });
      }

      const verification = await verifyCeloTransfer(txHash, address, token, prizePoolAddress);
      if (!verification.valid) {
        log("celo_pay_rejected", { address, txHash, token, reason: verification.reason });
        return res.status(400).json({ error: "tx_verification_failed", reason: verification.reason });
      }

      log("celo_pay_confirmed", { address, txHash, token });
      await upsertPaidUser(address, { referredBy, platform: "celo", entryKind: "paid", entryToken: token.toLowerCase() });

      const sessionId = await createSessionRecord(address);
      setSessionCookie(res, sessionId);

      res.json({ ok: true, paid: true, address, txHash, token, chain: "celo" });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  return router;
}
