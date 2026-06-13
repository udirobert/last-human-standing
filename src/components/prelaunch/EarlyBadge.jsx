/**
 * Standalone "Early supporter" badge. Shown next to TrustBadge on
 * every post-signup surface for users who reserved before launch.
 */
export default function EarlyBadge({ reservedAt, size = "sm", className = "" }) {
  if (!reservedAt) return null;
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber/50 bg-amber/10 text-amber font-mono tracking-wide uppercase ${pad} ${className}`}
      title="Early supporter — signed up before launch"
    >
      <span aria-hidden>★</span>
      <span>Early</span>
    </span>
  );
}
