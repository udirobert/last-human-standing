import { canvasToPngBlob, renderMomentCard } from "./momentCard.js";
import { MiniKit } from "@worldcoin/minikit-js";

/**
 * Share a mythic moment card.
 * Prefers MiniKit.share() inside World App, then native share with a PNG
 * file (X / iMessage / Stories), then Farcaster composeCast, then URL
 * share, then clipboard.
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

    // World App native share sheet — can attach the PNG and opens system UI
    if (MiniKit.isInstalled()) {
      try {
        const shareInput = {
          title: "Last Human Standing",
          text: opts.text,
          url: opts.url,
          ...(file ? { files: [file] } : {}),
        };
        await MiniKit.share(shareInput);
        return "shared";
      } catch (e) {
        if (e?.name === "AbortError") return "dismissed";
        // Fall through to browser-native share
      }
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
