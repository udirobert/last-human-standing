import { Router } from "express";
import { sendPushToAddress, broadcastPush, getVapidPublicKey } from "../lib/push.js";

export default function pushRoutes({ requireAuth, supabaseAdmin, log }) {
  const router = Router();

  router.get("/vapid-key", (req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
      return res.status(501).json({ error: "vapid_not_configured" });
    }
    res.json({ publicKey: key });
  });

  router.post("/subscribe", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(501).json({ error: "database_not_configured" });
    }
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "invalid_subscription" });
    }
    try {
      await supabaseAdmin.from("push_subscriptions").upsert(
        { address: req.user.address, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: "endpoint" },
      );
      log("push_subscribe", { address: req.user.address });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "db_failed", message: e instanceof Error ? e.message : "unknown" });
    }
  });

  router.post("/unsubscribe", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(501).json({ error: "database_not_configured" });
    }
    try {
      await supabaseAdmin.from("push_subscriptions").delete().eq("address", req.user.address);
      log("push_unsubscribe", { address: req.user.address });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: "db_failed", message: e instanceof Error ? e.message : "unknown" });
    }
  });

  router.post("/test", async (req, res) => {
    const adminToken = process.env.ADMIN_TOKEN;
    const token = req.headers["x-admin-token"];
    if (!adminToken || token !== adminToken) {
      return res.status(401).json({ error: "not_authorized" });
    }
    const target = req.body.address;
    const result = target
      ? await sendPushToAddress(supabaseAdmin, target, {
          title: "Test Notification",
          body: "This is a test from Last Human Standing.",
          data: { type: "test" },
        })
      : await broadcastPush(supabaseAdmin, {
          title: "Test Broadcast",
          body: "This is a broadcast test from Last Human Standing.",
          data: { type: "test" },
        });
    res.json({ ok: true, ...result });
  });

  return router;
}
