/**
 * Transactional email via Resend (optional — no-op when unconfigured).
 */

const FROM = process.env.EMAIL_FROM || "Last Human Standing <notify@lasthumanstanding.thisyearnofear.com>";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { sent: false, reason: "not_configured" };

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        text,
        html: html || undefined,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { sent: false, reason: `resend_${resp.status}`, detail: body.slice(0, 200) };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
