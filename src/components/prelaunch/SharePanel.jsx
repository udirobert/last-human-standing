import { useEffect, useState } from "react";
import { usePolling } from "../../hooks/usePolling.js";

/**
 * Share + personal-rank panel. Single source of truth for the
 * prelaunch virality surface: 𝕏 compose, Warpcast compose, copy
 * link, and "you're #N top referrer" social proof.
 */
export default function SharePanel({ referralCode, referralCount = 0, className = "" }) {
  const [copied, setCopied] = useState(false);

  const { data: rankData } = usePolling(
    referralCode ? `/api/referral-rank/${referralCode}` : null,
    {
      intervalMs: 60_000,
      transform: (json) => json,
      initial: null,
    },
  );

  const shareUrl = typeof window !== "undefined" && referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : "";
  // One consistent voice — no emoji-spam, real stakes, attributable invite
  // (design review finding 6). The hook is the field reduction, not a party.
  const shareText = encodeURIComponent(
    `I'm in Cohort 1 of Last Human Standing — a free 5-day survival game for verified humans. One last human takes the prize. Take my invite: ${shareUrl}`,
  );

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!referralCode) return null;

  return (
    <div className={`w-full space-y-3 ${className}`}>
      <div className="bg-smoke/50 rounded-xl p-3 space-y-1">
        <p className="text-dim text-xs font-mono uppercase">Your referral link</p>
        <p className="text-neon text-sm font-mono truncate">{shareUrl}</p>
        {referralCount > 0 && (
          <p className="text-amber text-sm font-mono tabular-nums">
            {referralCount} friend{referralCount !== 1 ? "s" : ""} invited
            {rankData?.rank && (
              <span className="text-dim"> · #{rankData.rank} top referrer</span>
            )}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl bg-[#1DA1F2]/20 text-[#1DA1F2] text-sm font-display hover:bg-[#1DA1F2]/30 transition-colors text-center"
        >
          𝕏 Post
        </a>
        <a
          href={`https://warpcast.com/frame-compose?text=${encodeURIComponent(`I'm in Cohort 1 of Last Human Standing — one last human takes the prize. Take my invite: ${shareUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA] text-sm font-display hover:bg-[#8B5CF6]/30 transition-colors text-center"
        >
          ſ Share
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 py-2.5 rounded-xl bg-neon/20 text-neon text-sm font-display hover:bg-neon/30 transition-colors"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
