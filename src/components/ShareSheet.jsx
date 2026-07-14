import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { momentCardDataUrl } from "../lib/shareMoment.js";
import { renderMomentCard, canvasToPngBlob } from "../lib/momentCard.js";
import { HumanCta, GameCta, GhostLink } from "./ui/CraftCta.jsx";
import { CUE_PRESS } from "../lib/cuelume.js";

/**
 * ShareSheet — the composed-tweet + downloadable-card share pattern.
 *
 * Twitter/X can't embed images via URL intents, so the best UX is:
 *   1. Compose the caption for the user (personalised)
 *   2. Let them download the personalised card PNG
 *   3. Open the X tweet intent so they can attach the image themselves
 *
 * On mobile with native file-share support, we also offer the system
 * share sheet as the first option (it can attach the PNG directly).
 *
 * Props:
 *   open       — boolean
 *   kind       — 'survive' | 'jury' | 'win'
 *   name       — display name for the card
 *   day        — day number
 *   rank       — rank number
 *   cap        — survival cap
 *   text       — composed share caption
 *   url        — share URL
 *   onNativeShare — optional: calls navigator.share with the PNG file
 *   onClose    — callback to close the sheet
 */
export default function ShareSheet({
  open,
  kind,
  name,
  day,
  rank,
  cap,
  text,
  url,
  photoUrl,
  onNativeShare,
  onClose,
}) {
  const [cardSrc, setCardSrc] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const host = typeof window !== "undefined" ? window.location.host : "lasthumanstanding.thisyearnofear.com";
        const src = await momentCardDataUrl(kind, { name, day, rank, cap, originHost: host, photoUrl });
        if (!cancelled) setCardSrc(src);
      } catch {
        if (!cancelled) setCardSrc(null);
      }
    })();
    // Reset state on open
    setDownloaded(false);
    setCopied(false);
    // Check if native share with files is available
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [new File([""], "test.png", { type: "image/png" })] }));
    return () => { cancelled = true; };
  }, [open, kind, name, day, rank, cap, photoUrl]);

  const handleDownload = async () => {
    const canvas = await renderMomentCard(kind, { name, day, rank, cap, photoUrl });
    const blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    const fileUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `lhs-${kind}-day-${day ?? "x"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(fileUrl);
    setDownloaded(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleTweet = () => {
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-ash/90 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24 }}
            className="w-full max-w-md bg-smoke border-t sm:border border-amber/30 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl text-bone tracking-wide">
                SHARE
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-ash border border-ember/40 text-bone font-mono text-sm hover:border-amber/60"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Card preview */}
            {cardSrc && (
              <img
                src={cardSrc}
                alt="Your moment card"
                className="w-full rounded-xl border border-ember/40 mb-4 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]"
              />
            )}

            {/* Composed caption */}
            <div className="bg-ash/60 rounded-xl border border-ember/30 p-3 mb-4">
              <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-2">
                Your post caption
              </p>
              <p className="text-bone font-body text-sm leading-relaxed whitespace-pre-line">
                {text}
              </p>
              <p className="text-dim font-mono text-xs mt-2 break-all">{url}</p>
            </div>

            {/* Helper text */}
            <p className="text-dim font-mono text-[10px] text-center mb-4 leading-relaxed">
              Download your card, then attach it when you post on X.
            </p>

            {/* Actions */}
            <div className="space-y-3">
              {/* Native share (mobile) — first priority when available */}
              {canNativeShare && onNativeShare && (
                <HumanCta onClick={onNativeShare}>
                  Share via system…
                </HumanCta>
              )}

              {/* Download card */}
              <HumanCta
                onClick={handleDownload}
                className={canNativeShare && onNativeShare ? "" : ""}
              >
                {downloaded ? "✓ Card downloaded" : "Download your card"}
              </HumanCta>

              {/* Post on X */}
              <GameCta tone="ghost" onClick={handleTweet}>
                Post on X / Twitter →
              </GameCta>

              {/* Copy caption */}
              <div className="flex justify-center">
                <GhostLink onClick={handleCopy}>
                  {copied ? "✓ Copied caption" : "Copy caption"}
                </GhostLink>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
