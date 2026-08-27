import { useMemo } from "react";
import { deriveLandscapeSeed, landscapeName } from "../../lib/landscape.js";

/**
 * LandscapeBadge — a small stamp showing the cohort's landscape identity.
 * "Landscape: Ash-7" — like a collectible mark. Deterministic per cohort.
 *
 * Displayed subtly in the shell footer (DM Mono, dim). Hidden when cohort
 * identity is unavailable (prelaunch without a cohort number / launch time).
 */
export default function LandscapeBadge({ cohortNumber = null, cohortLaunchAt = null }) {
  const name = useMemo(() => {
    if (cohortNumber == null || !cohortLaunchAt) return null;
    const ms = Date.parse(cohortLaunchAt);
    if (!Number.isFinite(ms)) return null;
    return landscapeName(deriveLandscapeSeed(cohortNumber, ms));
  }, [cohortNumber, cohortLaunchAt]);

  if (!name) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-dim/60"
    >
      <span className="uppercase">Landscape</span>
      <span className="text-amber/40">•</span>
      <span className="text-bone/50">{name}</span>
    </div>
  );
}
