import { useTrustTier } from "../hooks/useTrustTier.js";

const STYLES = {
  verified: "bg-neon/10 border-neon/40 text-neon",
  provisional: "bg-amber/10 border-amber/40 text-amber",
  unverified: "bg-smoke border-ember text-dim",
};

const ICONS = {
  verified: "✓",
  provisional: "◐",
  unverified: "○",
};

/**
 * @param {{ size?: 'sm' | 'md', className?: string, showEarlyBadge?: boolean, reservedAt?: string | null }} props
 */
export default function TrustBadge({ size = "sm", className = "", showEarlyBadge = false, reservedAt = null }) {
  const { tier, labels } = useTrustTier();
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]";

  // Early supporter = signed up before launch (reserved_at is set and before GAME_LAUNCH_AT)
  const isEarly = showEarlyBadge && reservedAt;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wide uppercase ${STYLES[tier]} ${pad} ${className}`}
        title={labels[tier]}
      >
        <span aria-hidden>{ICONS[tier]}</span>
        <span>{labels[tier]}</span>
      </span>
      {isEarly && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-amber/50 bg-amber/10 text-amber font-mono tracking-wide uppercase ${pad} ${className}`}
          title="Early supporter — signed up before launch"
        >
          <span aria-hidden>★</span>
          <span>Early</span>
        </span>
      )}
    </div>
  );
}
