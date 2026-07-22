/**
 * Telegram bot: link accounts + send round alerts.
 */

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

export function buildTelegramDeepLink(token) {
  const bot = getTelegramBotUsername();
  if (!bot || !token) return null;
  return `https://t.me/${bot}?start=link_${token}`;
}

/**
 * @param {number|string} chatId
 * @param {string} text
 */
export async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return { sent: false, reason: "not_configured" };

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.ok) {
      return { sent: false, reason: json.description || `telegram_${resp.status}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
