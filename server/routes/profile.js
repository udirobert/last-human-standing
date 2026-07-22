import { Router } from "express";
import { randomBytes } from "node:crypto";
import {
  assessReachability,
  loadPushFlags,
  loadReachability,
  normalizeEmail,
  normalizeTelegramUsername,
} from "../lib/reachability.js";
import { buildTelegramDeepLink, getTelegramBotUsername, isTelegramConfigured } from "../lib/telegramNotify.js";
import { isEmailConfigured } from "../lib/email.js";
import { ensureObjectBody, ensureString, sendValidationError } from "../lib/validators.js";

const LINK_TTL_MS = 1000 * 60 * 60; // 1 hour

export default function profileRoutes({ requireAuth, supabaseAdmin, log, rateLimit, rateLimitStorage }) {
  const router = Router();

  router.get("/profile/reachability", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(501).json({ error: "database_not_configured" });
    }
    try {
      const state = await loadReachability(supabaseAdmin, req.user.address);
      res.json({
        ok: true,
        eligible: state.eligible,
        missing: state.missing,
        channels: state.channels,
        subs: state.subs,
        telegramBot: getTelegramBotUsername(),
        telegramConfigured: isTelegramConfigured(),
        emailConfigured: isEmailConfigured(),
      });
    } catch (e) {
      res.status(500).json({ error: "reachability_failed", message: e instanceof Error ? e.message : "unknown" });
    }
  });

  router.post("/profile/contact", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(501).json({ error: "database_not_configured" });
    }
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const emailRaw = ensureString(body.email, { field: "email", required: false, maxLength: 200 });
      const telegramRaw = ensureString(body.telegramUsername, {
        field: "telegramUsername",
        required: false,
        maxLength: 64,
      });

      const email = emailRaw ? normalizeEmail(emailRaw) : undefined;
      if (emailRaw && !email) {
        return res.status(400).json({ error: "invalid_email" });
      }

      const telegramUsername = telegramRaw ? normalizeTelegramUsername(telegramRaw) : undefined;
      if (telegramRaw && !telegramUsername) {
        return res.status(400).json({ error: "invalid_telegram_username" });
      }

      const patch = { last_seen_at: new Date().toISOString() };
      if (email !== undefined) patch.contact_email = email;
      if (telegramUsername !== undefined) patch.telegram_username = telegramUsername;

      await supabaseAdmin.from("users").upsert(
        { address: req.user.address.toLowerCase(), ...patch },
        { onConflict: "address" },
      );

      const state = await loadReachability(supabaseAdmin, req.user.address);
      if (state.eligible) {
        await supabaseAdmin
          .from("users")
          .update({ reachability_completed_at: new Date().toISOString() })
          .eq("address", req.user.address.toLowerCase());
      }

      log("profile_contact", { address: req.user.address, hasEmail: Boolean(email), hasTelegram: Boolean(telegramUsername) });
      res.json({ ok: true, eligible: state.eligible, missing: state.missing, channels: state.channels });
    } catch (e) {
      sendValidationError(res, e);
    }
  });

  /** Capture Farcaster / World identity from the client after login. */
  router.post("/profile/sync-platform", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(501).json({ error: "database_not_configured" });
    }
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const platform = ensureString(body.platform, { field: "platform", required: false, maxLength: 32 });
      const username = ensureString(body.username, { field: "username", required: false, maxLength: 64 });
      const farcasterFid = body.farcasterFid != null ? Number(body.farcasterFid) : null;

      const patch = { last_seen_at: new Date().toISOString() };
      if (platform) patch.platform = platform;
      if (username) patch.username = username;
      if (Number.isFinite(farcasterFid) && farcasterFid > 0) patch.farcaster_fid = farcasterFid;

      await supabaseAdmin.from("users").upsert(
        { address: req.user.address.toLowerCase(), ...patch },
        { onConflict: "address" },
      );

      const state = await loadReachability(supabaseAdmin, req.user.address);
      if (state.eligible) {
        await supabaseAdmin
          .from("users")
          .update({ reachability_completed_at: new Date().toISOString() })
          .eq("address", req.user.address.toLowerCase());
      }

      res.json({ ok: true, eligible: state.eligible, missing: state.missing, channels: state.channels });
    } catch (e) {
      sendValidationError(res, e);
    }
  });

  router.post(
    "/profile/telegram-link",
    requireAuth,
    rateLimit({ keyFn: (req) => `tglink:${req.user?.address || req.ip}`, limit: 10, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      if (!supabaseAdmin) {
        return res.status(501).json({ error: "database_not_configured" });
      }
      if (!isTelegramConfigured()) {
        return res.status(501).json({ error: "telegram_not_configured" });
      }

      const token = randomBytes(12).toString("hex");
      const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();

      await supabaseAdmin.from("users").upsert(
        {
          address: req.user.address.toLowerCase(),
          telegram_link_token: token,
          telegram_link_expires_at: expiresAt,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "address" },
      );

      const url = buildTelegramDeepLink(token);
      res.json({ ok: true, url, expiresAt, botUsername: getTelegramBotUsername() });
    },
  );

  return router;
}

export { assessReachability, loadReachability, loadPushFlags };
