import crypto from "crypto";
import { Router } from "express";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { loadReachability } from "../lib/reachability.js";
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
  rateLimit,
  rateLimitStorage,
}) {
  const router = Router();

  // ---------- POST /api/nonce ----------
  // Rate-limited to 20/hour/IP to prevent nonce enumeration.
  // Nonces are one-time-use and short-lived (30 min), but without
  // rate limiting an attacker could grind the /complete-siwe path.
  router.post(
    "/nonce",
    rateLimit({ keyFn: (req) => `nonce:${req.ip}`, limit: 20, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
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
  // Rate-limited to 10/min/IP to prevent brute-force SIWE completion
  // attempts. Each completion consumes a nonce, so even if an attacker
  // gets through the nonce gate, they're limited here too.
  router.post(
    "/complete-siwe",
    rateLimit({ keyFn: (req) => `siwe:${req.ip}`, limit: 10, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    const { payload, nonce, statement, requestId } = body;
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
      // Pass statement and requestId for additional server-side validation
      // so the signed SIWE message must contain the exact values the client sent.
      const verification = await verifySiweMessage(payload, nonce, statement, requestId);
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

    let reachability = null;
    if (supabaseAdmin) {
      const state = await loadReachability(supabaseAdmin, req.user.address);
      reachability = {
        eligible: state.eligible,
        missing: state.missing,
        channels: state.channels,
      };
    }

    res.json({
      ok: true,
      address: req.user.address,
      isPaid: Boolean(userRecord?.paid),
      worldIdVerified: Boolean(userRecord?.world_id_verified),
      humanityVerified,
      humanityProvider: userRecord?.humanity_provider ?? null,
      username: userRecord?.username ?? null,
      referralCode: userRecord?.referral_code ?? null,
      referralCount: userRecord?.referral_count ?? 0,
      reservedAt: userRecord?.reserved_at ?? null,
      cohort: userRecord?.cohort ?? null,
      entryKind: userRecord?.entry_kind ?? null,
      contactEmail: userRecord?.contact_email ?? null,
      telegramLinked: Boolean(userRecord?.telegram_user_id),
      farcasterFid: userRecord?.farcaster_fid ?? null,
      reachability,
    });
  });

  return router;
}
