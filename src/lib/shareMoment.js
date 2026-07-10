import { canvasToPngBlob, renderMomentCard } from "./momentCard.js";

/**
 * Share a mythic moment card.
 * Prefers native share with a PNG file (X / iMessage / Stories get an image).
 * Falls back to share URL (OG unfurl) then clipboard.
 *
 * @param {'survive'|'jury'|'win'} kind
 * @param {{
 *   name?: string,
 *   day?: number|string,
 *   rank?: number|string,
 *   cap?: number|string,
 *   text: string,
 *   url: string,
 *   isFarcaster?: boolean,
 * }} opts
 * @returns {Promise<'shared'|'copied'|'dismissed'|'failed'>}
 */
export async function shareMoment(kind, opts) {
  const originHost = (() => {
    try {
      return new URL(opts.url || window.location.origin).host;
    } catch {
      return "lasthumanstanding.thisyearnofear.com";
    }
  })();

  const canvas = renderMomentCard(kind, {
    name: opts.name,
    day: opts.day,
    rank: opts.rank,
    cap: opts.cap,
    originHost,
  });
  const blob = await canvasToPngBlob(canvas);
  const file = blob
    ? new File([blob], `lhs-${kind}-day-${opts.day ?? "x"}.png`, { type: "image/png" })
    : null;

  try {
    if (opts.isFarcaster) {
      const { sdk } = await import("@farcaster/miniapp-sdk");
      await sdk.actions.composeCast({
        text: opts.text,
        embeds: [opts.url],
      });
      return "shared";
    }

    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        text: opts.text,
        url: opts.url,
        title: "Last Human Standing",
      });
      return "shared";
    }

    if (navigator.share) {
      await navigator.share({ text: opts.text, url: opts.url, title: "Last Human Standing" });
      return "shared";
    }

    await navigator.clipboard.writeText(`${opts.text}\n${opts.url}`);
    return "copied";
  } catch (err) {
    if (err?.name === "AbortError") return "dismissed";
    try {
      await navigator.clipboard.writeText(`${opts.text}\n${opts.url}`);
      return "copied";
    } catch {
      return "failed";
    }
  }
}

/** Data-URL preview for in-ceremony card display. */
export function momentCardDataUrl(kind, data) {
  const canvas = renderMomentCard(kind, data);
  return canvas ? canvas.toDataURL("image/png") : null;
}
