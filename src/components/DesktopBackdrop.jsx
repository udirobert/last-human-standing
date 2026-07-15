import { createPortal } from "react-dom";
import { useRound } from "../world/RoundProvider.jsx";
import { useStats } from "../hooks/useStats.js";
import TopographicTexture from "./ui/TopographicTexture.jsx";
import PopulationField from "./ui/PopulationField.jsx";
import CoordinateGrid from "./ui/CoordinateGrid.jsx";
import CompassRose from "./ui/CompassRose.jsx";
import DozingCat from "./ui/DozingCat.jsx";
import CoffeeBrew from "./ui/CoffeeBrew.jsx";
import ThemeMotif from "./ui/ThemeMotif.jsx";

/**
 * DesktopBackdrop — the cultivated environment OUTSIDE the 430px game
 * column on desktop (≥480px). On mobile this renders nothing.
 *
 * Layer stack (portal to document.body, z-0, behind #root):
 *   1. Coordinate grid — faint map grid (A-H, 1-8)
 *   2. Topographic texture — contour lines + day markers (D1-D5)
 *   3. Population field — living dots + eliminated ghost rings
 *   4. Large hand-painted motifs — DozingCat, CoffeeBrew, tree, ramen
 *      deployed at scale in the gutters, giving the empty space the
 *      warm human character that the art direction demands
 *   5. Compass rose — painted, gently wobbling, in a gutter corner
 *
 * Plus CSS-positioned watermarks (left: brand, right: cohort status).
 *
 * Hidden during landing mode (full-bleed onboarding has its own backdrop).
 * Hidden on mobile (min-[480px]:block; watermarks ≥768px).
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

  // Motif opacity — slightly higher in ended phase (less content competing)
  const motifOpacity = phase === "ended" ? 0.32 : 0.28;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden min-[480px]:block"
        aria-hidden="true"
      >
        {/* Coordinate grid — faint map structure */}
        <CoordinateGrid opacity={0.035} />

        {/* Topographic texture — contour lines + day markers */}
        <TopographicTexture
          seed={topoSeed}
          opacity={phase === "ended" ? 0.04 : 0.06}
          rings={9}
          spacing={48}
          wobble={20}
          currentDay={currentDay}
          phase={phase}
        />

        {/* Population field — living dots + eliminated ghost rings */}
        <PopulationField
          count={populationCount}
          total={populationTotal}
          phase={phase}
          winner={populationWinner}
          seed={23}
        />

        {/* Large hand-painted motifs in the gutters — the warm human
            character that the art direction demands. These are the same
            gouache components used inside the app, deployed at scale in
            the empty desktop space. The contrast between the cold topo
            lines and the warm painted motifs IS the art direction thesis. */}

        {/* DozingCat — bottom-left gutter, curled and sleeping */}
        <div
          className="hidden min-[480px]:block absolute left-[3%] bottom-[8%]"
          style={{ opacity: motifOpacity }}
        >
          <DozingCat size={140} />
        </div>

        {/* CoffeeBrew — top-right gutter, steaming */}
        <div
          className="hidden min-[480px]:block absolute right-[4%] top-[10%]"
          style={{ opacity: motifOpacity }}
        >
          <CoffeeBrew size={120} />
        </div>

        {/* Tree — left gutter, mid-height (hidden on narrower desktops) */}
        <div
          className="hidden min-[640px]:block absolute left-[2%] top-[35%]"
          style={{ opacity: motifOpacity * 0.85 }}
        >
          <ThemeMotif emoji="🌳" size={100} label="a park" />
        </div>

        {/* Ramen — right gutter, lower (hidden on narrower desktops) */}
        <div
          className="hidden min-[640px]:block absolute right-[3%] bottom-[20%]"
          style={{ opacity: motifOpacity * 0.8 }}
        >
          <ThemeMotif emoji="🍜" size={90} label="a warm meal" />
        </div>

        {/* Sunrise — left gutter, upper (only on wide screens) */}
        <div
          className="hidden min-[768px]:block absolute left-[5%] top-[5%]"
          style={{ opacity: motifOpacity * 0.75 }}
        >
          <ThemeMotif emoji="🌅" size={80} label="sunrise" />
        </div>

        {/* Compass rose — bottom-right gutter, gently wobbling */}
        <div
          className="hidden min-[480px]:block absolute right-[5%] bottom-[5%]"
          style={{ opacity: 0.22 }}
        >
          <CompassRose size={90} />
        </div>
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
