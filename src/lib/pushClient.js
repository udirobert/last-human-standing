/**
 * Push notification client helper.
 * Handles subscribing / unsubscribing via the browser Push API
 * and syncing the subscription with the server.
 */

const CONVERTER_B64 =
  /[+/]/g;

/**
 * Convert a base64url-encoded string to a Uint8Array.
 * The VAPID public key from the server is base64url-encoded.
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications.
 * @param {string} serverVapidKey - the VAPID public key (base64url) from the server
 * @returns {Promise<PushSubscription>}
 */
export async function subscribePush(serverVapidKey) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push API not available");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Already subscribed — return existing
    return existing;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(serverVapidKey),
  });

  // Send subscription to server
  const subData = subscription.toJSON();
  const resp = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      endpoint: subData.endpoint,
      keys: subData.keys,
    }),
  });

  if (!resp.ok) {
    // If server rejected, unsubscribe locally
    await subscription.unsubscribe();
    const text = await resp.text();
    throw new Error(`Server rejected push subscription: ${text}`);
  }

  return subscription;
}

/**
 * Unsubscribe from push notifications and remove from server.
 */
export async function unsubscribePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();

  // Notify server
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
  }).catch(() => {});
}

/**
 * Check permission and subscription status.
 * @returns {Promise<{ permitted: boolean, subscribed: boolean }>}
 */
export async function getPushStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { permitted: false, subscribed: false };
  }

  const permitted = Notification.permission === "granted";
  if (!permitted) {
    return { permitted: false, subscribed: false };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return { permitted: true, subscribed: Boolean(subscription) };
}
