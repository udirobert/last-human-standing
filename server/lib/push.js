/**
 * Push notification library for Last Human Standing.
 * Uses the web-push library (VAPID) to send notifications to subscribed users.
 *
 * VAPID keys should be set in environment variables:
 *   VAPID_PUBLIC_KEY  — used by the client to subscribe
 *   VAPID_SECRET — used by the server to send
 *   VAPID_EMAIL       — contact email for push service
 *
 * When VAPID keys are not set, all send functions are no-ops.
 */

import webPush from "web-push";

// Read at call-time so tests can set process.env dynamically
const DEFAULT_VAPID_EMAIL = "admin@lasthumanstanding.thisyearnofear.com";

let vapidConfigured = false;

function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}
function getVapidSecretKey() {
  return process.env.VAPID_SECRET || null;
}
function getVapidEmail() {
  return process.env.VAPID_EMAIL || DEFAULT_VAPID_EMAIL;
}

function ensureConfigured() {
  const pub = getVapidPublicKey();
  const priv = getVapidSecretKey();
  if (!pub || !priv) return false;
  // Re-configure if keys have changed since last time
  const current = `${pub}::${priv}::${getVapidEmail()}`;
  if (vapidConfigured === current) return true;
  webPush.setVapidDetails(`mailto:${getVapidEmail()}`, pub, priv);
  vapidConfigured = current;
  return true;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient|null} supabaseAdmin
 * @param {string} address - wallet address (lowercase)
 * @param {object} notification - { title: string, body: string, icon?: string, data?: object }
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendPushToAddress(supabaseAdmin, address, notification) {
  if (!ensureConfigured() || !supabaseAdmin) {
    return { sent: 0, failed: 0 };
  }

  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("address", address);

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const payload = JSON.stringify({
    title: notification.title || "Last Human Standing",
    body: notification.body || "",
    icon: notification.icon || "/favicon.svg",
    badge: "/favicon.svg",
    timestamp: Date.now(),
    data: notification.data || {},
  });

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      );
      sent += 1;
    } catch (err) {
      // 410 Gone / 404 Not Found — subscription is stale, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id).catch(() => {});
      }
      failed += 1;
    }
  }

  return { sent, failed };
}

/**
 * Broadcast a notification to ALL subscribed users.
 * @param {import("@supabase/supabase-js").SupabaseClient|null} supabaseAdmin
 * @param {object} notification
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function broadcastPush(supabaseAdmin, notification) {
  if (!ensureConfigured() || !supabaseAdmin) {
    return { sent: 0, failed: 0 };
  }

  const { data: allSubs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, address, endpoint, p256dh, auth");

  if (error || !allSubs?.length) {
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title || "Last Human Standing",
    body: notification.body || "",
    icon: notification.icon || "/favicon.svg",
    badge: "/favicon.svg",
    timestamp: Date.now(),
    data: notification.data || {},
  });

  let sent = 0;
  let failed = 0;

  for (const sub of allSubs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sent += 1;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id).catch(() => {});
      }
      failed += 1;
    }
  }

  return { sent, failed };
}


// Public re-exports for use in routes
export { getVapidPublicKey };
