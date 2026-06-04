import crypto from "crypto";
import { Router } from "express";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { ensureObjectBody, sendValidationError, ensureString } from "../lib/validators.js";

/**
 * Auth-related routes: nonce issuance, SIWE completion, logout, /me.
 *
 * Each route is a function that takes the shared dependencies from index.js
 * to keep test wiring explicit and avoid module-level state.
 */
export default function authRoutes({
  requireAuth,
  supabaseAdmin,
  log,
  randomId,
  makeNonce,
  makeReferralCode,
  createSessionRecord,
  getSessionRecord,
  deleteSessionRecord,
  setSessionCookie,
  clearSessionCookie,
  getUserRecord,
  isProd,
  SESSION_COOKIE,
}) {
  const router = Router();

  // ---------- POST /api/nonce ----------
  router.post("/nonce", async (req, res) => {
    const nonce = makeNonce();
    if (supabaseAdmin) {
      await supabaseAdmin.from("siwe_nonces").upsert({
        nonce,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      });
    }
    res.json({ nonce });
  });

  // ---------- POST /api/complete-siwe ----------
  router.post("/complete-siwe", async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    const { payload, nonce } = body;
    if (!payload || !nonce) {
      return res.status(400).json({ error: "missing_payload_or_nonce" });
    }

    // Verify nonce exists and is unexpired
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("siwe_nonces")
        .select("nonce,expires_at")
        .eq("nonce", nonce)
        .maybeSingle();
      if (!data || Date.parse(data.expires_at) <= Date.now()) {
        return res.status(400).json({ error: "invalid_or_expired_nonce" });
      }
      await supabaseAdmin.from("siwe_nonces").delete().eq("nonce", nonce);
    }

    try {
      const verification = await verifySiweMessage(payload, nonce);
      if (!verification.isValid) {
        log("siwe_invalid", { nonce });
        return res.status(401).json({ error: "invalid_siwe" });
      }
      const address = verification.siweMessageData.address;
      const sessionId = await createSessionRecord(address);
      log("siwe_success", { address });
      if (supabaseAdmin) {
        await supabaseAdmin.from("users").upsert(
          { address, last_seen_at: new Date().toISOString() },
          { onConflict: "address" },
        );
      }
      setSessionCookie(res, sessionId);
      res.json({ ok: true, address });
    } catch (e) {
      log("siwe_error", { nonce, message: e instanceof Error ? e.message : "unknown" });
      res.status(400).json({
        error: "siwe_verification_failed",
        message: e instanceof Error ? e.message : "unknown_error",
      });
    }
  });

  // ---------- POST /api/logout ----------
  router.post("/logout", async (req, res) => {
    const sid = req.cookies?.[SESSION_COOKIE];
    await deleteSessionRecord(sid);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // ---------- GET /api/me ----------
  router.get("/me", requireAuth, async (req, res) => {
    const userRecord = await getUserRecord(req.user.address);
    const humanityVerified =
      Boolean(userRecord?.world_id_verified) || Boolean(userRecord?.humanity_nullifier);
    res.json({
      ok: true,
      address: req.user.address,
      isPaid: Boolean(userRecord?.paid),
      worldIdVerified: Boolean(userRecord?.world_id_verified),
      humanityVerified,
      humanityProvider: userRecord?.humanity_provider ?? null,
      username: userRecord?.username ?? null,
      referralCode: userRecord?.referral_code ?? null,
    });
  });

  return router;
}
