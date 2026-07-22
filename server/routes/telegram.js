import { Router } from "express";
import { loadReachability } from "../lib/reachability.js";
import { sendTelegramMessage } from "../lib/telegramNotify.js";

/**
 * Telegram bot webhook — links wallet addresses via /start link_<token>.
 * Set TELEGRAM_WEBHOOK_SECRET and pass ?secret= in the webhook URL.
 */
export default function telegramRoutes({ supabaseAdmin, log }) {
  const router = Router();

  router.post("/telegram/webhook", async (req, res) => {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected && req.query.secret !== expected) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (!supabaseAdmin) {
      return res.status(501).json({ error: "database_not_configured" });
    }

    const update = req.body;
    const message = update?.message;
    const text = message?.text || "";
    const chatId = message?.chat?.id;
    const from = message?.from;

    if (!chatId || !text.startsWith("/start")) {
      return res.json({ ok: true });
    }

    const parts = text.trim().split(/\s+/);
    const payload = parts[1] || "";

    if (!payload.startsWith("link_")) {
      await sendTelegramMessage(
        chatId,
        "👋 Last Human Standing bot.\n\nOpen the game, reserve your slot, and tap <b>Link Telegram</b> to connect alerts.",
      );
      return res.json({ ok: true });
    }

    const token = payload.slice("link_".length);
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("address, telegram_link_expires_at")
      .eq("telegram_link_token", token)
      .maybeSingle();

    if (!user || !user.telegram_link_expires_at || Date.parse(user.telegram_link_expires_at) <= Date.now()) {
      await sendTelegramMessage(chatId, "⏱ Link expired. Go back to the game and generate a new Telegram link.");
      return res.json({ ok: true });
    }

    await supabaseAdmin
      .from("users")
      .update({
        telegram_user_id: from?.id ?? chatId,
        telegram_username: from?.username ?? null,
        telegram_link_token: null,
        telegram_link_expires_at: null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("address", user.address);

    const state = await loadReachability(supabaseAdmin, user.address);
    if (state.eligible) {
      await supabaseAdmin
        .from("users")
        .update({ reachability_completed_at: new Date().toISOString() })
        .eq("address", user.address);
    }

    log("telegram_linked", { address: user.address, chatId, username: from?.username ?? null });
    await sendTelegramMessage(
      chatId,
      "✅ Linked! You'll get round alerts here when Day 1 opens.\n\nhttps://lasthumanstanding.thisyearnofear.com",
    );

    return res.json({ ok: true });
  });

  return router;
}
