import { createPortal } from "react-dom";
import { useRound } from "../world/RoundProvider.jsx";
import { useStats } from "../hooks/useStats.js";
import TopographicTexture from "./ui/TopographicTexture.jsx";
import PopulationField from "./ui/PopulationField.jsx";

/**
 * DesktopBackdrop — the cultivated environment OUTSIDE the 430px game
 * column on desktop (≥480px). On mobile this renders nothing.
 *
 * The game column (#root, max-width 430px) has its own AmbientBackdrop
 * inside it. But on desktop, the surrounding gutters were just a flat
 * warm gradient with paper grain — no brand essence, no topographic
 * texture, no population dots. This component extends the same visual
 * language to the full viewport so desktop feels curated, not empty.
 *
 * Rendered as a fixed full-viewport layer behind #root (z-0). Shares
 * the same TopographicTexture and PopulationField components as
 * AmbientBackdrop, with slightly lower opacity so the game column
 * remains the focal point.
 *
 * CSS handles the base gradient + grain on html/body (index.css). This
 * component adds the topo texture and population field on top of that.
 */

const TOPO_SEEDS = { prelaunch: 17, live: 42, ended: 89 };

export default function DesktopBackdrop({ phase = "prelaunch" }) {
  const { reservedCount, cohortSize, isEnded, winner, currentDay } = useRound();
  const { stats } = useStats();

  // Don't render during landing mode — the landing is full-bleed with its
  // own AmbientBackdrop, and #root becomes transparent/full-width, so the
  // DesktopBackdrop would double up with the in-page backdrop.
  const isLandingMode = typeof document !== "undefined" &&
    document.body.classList.contains("landing-mode");

  const activePlayers = stats?.players?.active ?? null;
  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const populationCount =
    phase === "prelaunch"
      ? reservedCount
      : phase === "ended"
        ? winner ? 1 : 0
        : activePlayers ?? totalPlayers;
  const populationTotal = cohortSize || 50;
  const populationWinner = isEnded && Boolean(winner);
  const topoSeed = TOPO_SEEDS[phase] ?? TOPO_SEEDS.prelaunch;

  if (isLandingMode) return null;

  const watermarkRight =
    phase === "prelaunch"
      ? `${reservedCount ?? 0} / ${cohortSize ?? 50} reserved`
      : phase === "ended"
        ? "game ended"
        : `${activePlayers ?? totalPlayers ?? 0} alive · day ${currentDay ?? "—"}`;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden min-[480px]:block"
        aria-hidden="true"
      >
        {/* Topographic texture — slightly more visible on desktop since
            the gutters have less content competing for attention */}
        <TopographicTexture
          seed={topoSeed}
          opacity={phase === "ended" ? 0.04 : 0.06}
          rings={9}
          spacing={48}
          wobble={20}
        />

        {/* Population field — same living dots as the in-app backdrop.
            On desktop these scatter across the full viewport, giving
            the gutters a sense of the crowd. */}
        <PopulationField
          count={populationCount}
          total={populationTotal}
          phase={phase}
          winner={populationWinner}
          seed={23} // different seed from the in-app field so dots don't mirror
        />
      </div>

      {/* Desktop gutter watermarks — faint vertical text that gives the
          empty gutters identity. CSS handles positioning and visibility
          (body > .desktop-watermark, shown ≥768px via media query). */}
      <div className="desktop-watermark" aria-hidden="true">
        LAST HUMAN STANDING
      </div>
      <div className="desktop-watermark-right" aria-hidden="true">
        {watermarkRight}
      </div>
    </>,
    document.body,
  );
}
