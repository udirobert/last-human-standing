/**
 * Multi-channel player notification — best-effort across push, World,
 * email, and Telegram. Used for round opens, eliminations, etc.
 */

import { sendPushToAddress } from "./push.js";
import { sendEmail } from "./email.js";
import { sendTelegramMessage } from "./telegramNotify.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabaseAdmin
 * @param {string} address
 * @param {{ title: string, body: string, data?: object }} notification
 */
export async function notifyPlayer(supabaseAdmin, address, notification) {
  const addr = address.toLowerCase();
  const results = { push: null, email: null, telegram: null };

  results.push = await sendPushToAddress(supabaseAdmin, addr, notification).catch(() => null);

  if (!supabaseAdmin) return results;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("contact_email, telegram_user_id")
    .eq("address", addr)
    .maybeSingle();

  if (user?.contact_email) {
    results.email = await sendEmail({
      to: user.contact_email,
      subject: notification.title,
      text: `${notification.body}\n\nhttps://lasthumanstanding.thisyearnofear.com`,
    });
  }

  if (user?.telegram_user_id) {
    results.telegram = await sendTelegramMessage(
      user.telegram_user_id,
      `<b>${escapeHtml(notification.title)}</b>\n${escapeHtml(notification.body)}`,
    );
  }

  return results;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
