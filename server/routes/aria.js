import { Router } from "express";
import {
  getAgentDid,
  getAgentHandle,
  ariaVerifyPhoto,
  ariaBuildPayoutTx,
  ariaSuggestNextRound,
  ariaBuildX402Request,
  ariaRegisterAgent,
} from "../lib/ariaAgent.js";
import { ensureObjectBody, ensureString, sendValidationError } from "../lib/validators.js";

/**
 * ARIA onchain agent routes.
 *
 * Public endpoints (no auth):
 *   GET  /api/aria/agent     - returns agent identity (DID + handle)
 *   GET  /api/aria/x402      - x402 payment-protocol request builder
 *   POST /api/aria/verify    - autonomous photo verification
 *   POST /api/aria/suggest   - suggest next round params
 *
 * Admin endpoints (require ADMIN_TOKEN):
 *   POST /api/aria/register  - register on 8004scan
 *   POST /api/aria/payout    - build payout transaction
 */
export default function ariaRoutes({ requireAdmin, log }) {
  const router = Router();

  // ---------- Public: agent identity ----------
  router.get("/aria/agent", (req, res) => {
    res.json({
      did: getAgentDid(),
      handle: getAgentHandle(),
      services: ["photo_verification", "round_management", "prize_distribution"],
      chains: ["celo"],
    });
  });

  // ---------- Public: photo verification (autonomous agent action) ----------
  router.post("/aria/verify", async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    try {
      const mediaPath = ensureString(body.mediaPath, { field: "mediaPath", maxLength: 255 });
      const mimeType = ensureString(body.mimeType, { field: "mimeType", maxLength: 64 });
      const result = await ariaVerifyPhoto({
        mediaPath,
        mimeType,
        sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
        dimensions: body.dimensions || null,
      });
      log("aria_verify", { action: result.action, reason: result.reason });
      res.json({ ok: true, ...result, agentDid: getAgentDid() });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  // ---------- Public: round suggestion ----------
  router.post("/aria/suggest", async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    try {
      const day = typeof body.day === "number" ? body.day : 1;
      const previousThemes = Array.isArray(body.previousThemes) ? body.previousThemes : [];
      const suggestion = await ariaSuggestNextRound({ day, previousThemes });
      res.json({ ok: true, ...suggestion });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  // ---------- Public: x402 payment challenge ----------
  router.post("/aria/x402", async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    try {
      const resource = ensureString(body.resource, { field: "resource", required: true, maxLength: 200 });
      const amountUsd = typeof body.amountUsd === "number" ? body.amountUsd : 1;
      const token = ensureString(body.token, { field: "token", maxLength: 16 }) || "cUSD";
      const recipientAddress = ensureString(body.recipientAddress, {
        field: "recipientAddress", maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/,
      }) || "0x0000000000000000000000000000000000000000";

      const x402Request = ariaBuildX402Request({
        resource, amountUsd, token, recipientAddress,
      });
      res.status(402).json(x402Request);
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  // ---------- Admin: ERC-8004 registration ----------
  router.post("/aria/register", requireAdmin, async (req, res) => {
    const result = await ariaRegisterAgent();
    log("aria_register", { ok: result.ok, reason: result.reason || "ok" });
    res.json(result);
  });

  // ---------- Admin: build payout transaction ----------
  router.post("/aria/payout", requireAdmin, async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    try {
      const winnerAddress = ensureString(body.winnerAddress, {
        field: "winnerAddress", required: true, maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/,
      });
      const amountUsd = typeof body.amountUsd === "number" ? body.amountUsd : 0;
      const token = ensureString(body.token, { field: "token", maxLength: 16 }) || "cUSD";
      const tx = await ariaBuildPayoutTx({ winnerAddress, amountUsd, token });
      log("aria_payout_build", { winnerAddress, amountUsd, token });
      res.json({ ok: true, tx, agentDid: getAgentDid() });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  return router;
}
