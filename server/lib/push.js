/**
 * Push notification library for Last Human Standing.
 *
 * Two delivery paths:
 * 1. Browser / PWA push via VAPID + web-push (PushManager subscriptions).
 * 2. World App native notifications via the Developer Portal
 *    /api/v2/minikit/send-notification API.
 *
 * VAPID keys and World API credentials are read at call-time from env.
 */

import webPush from "web-push";

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

function getWorldAppId() {
  return process.env.WORLD_APP_ID || null;
}
function getWorldApiKey() {
  return process.env.WORLD_DEV_PORTAL_API_KEY || null;
}

function ensureVapidConfigured() {
  const pub = getVapidPublicKey();
  const priv = getVapidSecretKey();
  if (!pub || !priv) return false;
  const current = `${pub}::${priv}::${getVapidEmail()}`;
  if (vapidConfigured === current) return true;
  webPush.setVapidDetails(`mailto:${getVapidEmail()}`, pub, priv);
  vapidConfigured = current;
  return true;
}

function isWorldPushConfigured() {
  return Boolean(getWorldAppId() && getWorldApiKey());
}

/**
 * Send a localized notification to the provided wallet addresses via the
 * World App Developer Portal API.
 *
 * @param {string[]} addresses - wallet addresses (lowercase)
 * @param {{ title: string, body: string, data?: object }} notification
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendWorldNotification(addresses, notification) {
  if (!addresses.length || !isWorldPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const appId = getWorldAppId();
  const apiKey = getWorldApiKey();
  const miniAppPath = `worldapp://mini-app?app_id=${appId}&path=${notification?.data?.path ?? "/"}`;

  const body = JSON.stringify({
    app_id: appId,
    wallet_addresses: addresses,
    localisations: [
      {
        language: "en",
        title: notification.title || "Last Human Standing",
        message: notification.body || "",
      },
    ],
    mini_app_path: miniAppPath,
  });

  try {
    const resp = await fetch("https://developer.worldcoin.org/api/v2/minikit/send-notification", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });
    // The API returns 200 with per-address reasons; if the HTTP call succeeds
    // we treat it as accepted (individual address failures are still counted).
    if (!resp.ok) {
      const text = await resp.text().catch(() => "unknown");
      throw new Error(`World API ${resp.status}: ${text}`);
    }
    return { sent: addresses.length, failed: 0 };
  } catch (e) {
    console.error("sendWorldNotification failed:", e instanceof Error ? e.message : e);
    return { sent: 0, failed: addresses.length };
  }
}

/**
 * Query the world_push_subscriptions table for the given addresses.
 * @param {import("@supabase/supabase-js").SupabaseClient|null} supabaseAdmin
 * @param {string[]} addresses
 * @returns {Promise<string[]>}
 */
async function getWorldPushAddresses(supabaseAdmin, addresses) {
  if (!supabaseAdmin || !addresses.length) return [];
  try {
    const { data } = await supabaseAdmin
      .from("world_push_subscriptions")
      .select("address")
      .in("address", addresses);
    return (data || []).map((row) => row.address.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient|null} supabaseAdmin
 * @param {string} address - wallet address (lowercase)
 * @param {object} notification - { title: string, body: string, icon?: string, data?: object }
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendPushToAddress(supabaseAdmin, address, notification) {
  let sent = 0;
  let failed = 0;

  // VAPID path
  if (ensureVapidConfigured() && supabaseAdmin) {
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("address", address);

    if (!error && subscriptions?.length) {
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
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
    }
  }

  // World App native path
  if (isWorldPushConfigured() && supabaseAdmin) {
    const worldAddresses = await getWorldPushAddresses(supabaseAdmin, [address]);
    if (worldAddresses.length) {
      const result = await sendWorldNotification(worldAddresses, notification);
      sent += result.sent;
      failed += result.failed;
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
  let sent = 0;
  let failed = 0;

  // VAPID path
  if (ensureVapidConfigured() && supabaseAdmin) {
    const { data: allSubs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, address, endpoint, p256dh, auth");

    if (!error && allSubs?.length) {
      const payload = JSON.stringify({
        title: notification.title || "Last Human Standing",
        body: notification.body || "",
        icon: notification.icon || "/favicon.svg",
        badge: "/favicon.svg",
        timestamp: Date.now(),
        data: notification.data || {},
      });

      for (const sub of allSubs) {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
    }
  }

  // World App native path
  if (isWorldPushConfigured() && supabaseAdmin) {
    const { data: worldSubs, error } = await supabaseAdmin
      .from("world_push_subscriptions")
      .select("address");

    if (!error && worldSubs?.length) {
      const addresses = worldSubs.map((row) => row.address.toLowerCase());
      // Batch in 1000-address chunks (API limit)
      const chunkSize = 1000;
      for (let i = 0; i < addresses.length; i += chunkSize) {
        const chunk = addresses.slice(i, i + chunkSize);
        const result = await sendWorldNotification(chunk, notification);
        sent += result.sent;
        failed += result.failed;
      }
    }
  }

  return { sent, failed };
}

export { getVapidPublicKey };
