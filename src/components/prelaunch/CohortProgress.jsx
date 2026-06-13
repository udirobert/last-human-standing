/**
 * Cohort progress bar with label and tone.
 *
 * Used by PrelaunchPanel for the two-bar cohort card (paid + free).
 * Renders: label / count text / progress bar.
 */
export default function CohortProgress({
  label,
  count = 0,
  total = 0,
  tone = "amber", // "amber" | "neon"
  className = "",
}) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  const full = total > 0 && count >= total;
  const barClass = tone === "neon" ? "bg-neon" : "bg-amber";
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-dim">{label}</span>
        <span className={full ? "text-neon" : "text-bone"}>
          {count.toLocaleString()} / {total}
        </span>
      </div>
      <div className="mt-1 h-1.5 bg-ember rounded-full overflow-hidden">
        <div
          className={`h-full ${barClass} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
