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
 * Trust tier badge (verified / provisional / unverified).
 * Pair with <EarlyBadge /> from components/prelaunch/ for the
 * "Early supporter" star chip — kept separate so this stays
 * presentational and un-opinionated about prelaunch state.
 *
 * @param {{ size?: 'sm' | 'md', className?: string }} props
 */
export default function TrustBadge({ size = "sm", className = "" }) {
  const { tier, labels } = useTrustTier();
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wide uppercase ${STYLES[tier]} ${pad} ${className}`}
      title={labels[tier]}
    >
      <span aria-hidden>{ICONS[tier]}</span>
      <span>{labels[tier]}</span>
    </span>
  );
}
