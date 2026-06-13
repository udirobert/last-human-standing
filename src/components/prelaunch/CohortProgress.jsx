/**
 * Cohort progress bar — "5 of 50" + percentage.
 * Pure: takes counts, renders the bar. No data fetching.
 */
export default function CohortProgress({ cohortSize, reservedCount, className = "" }) {
  const pct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs font-mono text-dim">
        <span>{reservedCount.toLocaleString()} of {cohortSize} players joined</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 bg-ember rounded-full overflow-hidden">
        <div
          className="h-full bg-amber rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
