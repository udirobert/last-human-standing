import Countdown from "../Countdown.jsx";
import CohortProgress from "./CohortProgress.jsx";

/**
 * Hero countdown + cohort bar used in the prelaunch panel.
 */
export default function CountdownCard({ launchAt, cohortSize, reservedCount, cohortFull }) {
  return (
    <div className="bg-smoke border border-amber/40 rounded-3xl p-6 relative overflow-hidden">
      <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Day 1 in</p>
      {launchAt
        ? <Countdown targetIso={launchAt} className="font-display text-5xl text-bone leading-none animate-glow" />
        : <p className="font-display text-3xl text-dim">TBA</p>}
      <div className="mt-4">
        <CohortProgress
          cohortSize={cohortSize}
          reservedCount={reservedCount}
        />
      </div>
      {cohortFull && (
        <p className="text-neon text-xs font-mono mt-3">✓ Season full · waiting for launch</p>
      )}
    </div>
  );
}
