import { useMemo } from "react";
import AmbientBackdrop from "./AmbientBackdrop.jsx";
import LandscapeBadge from "./ui/LandscapeBadge.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import { useStats } from "../hooks/useStats.js";

/**
 * Shared game viewport shell.
 *
 * Every in-app screen must own a fixed viewport height so a single
 * `flex-1 min-h-0 overflow-y-auto` child can scroll. Using only
 * `min-h-screen` + `overflow-hidden` lets the parent grow with content,
 * which kills inner scrollers (especially Chat / Feed / Check-in).
 *
 * Always mounts AmbientBackdrop so the warm room stays continuous.
 * Pulls population data from game state so the backdrop's population
 * dots reflect the real surviving field.
 * Safe-area insets keep chrome clear of notch / home indicator.
 */
export default function AppShell({
  phase = "prelaunch",
  children,
  className = "",
  flourishes,
  ember,
  /** Extra top inset beyond safe-area (for FAQ / status row). Default matches pt-safe. */
  padTop = true,
}) {
  const { reservedCount, cohortSize, isEnded, winner, currentDay, round, launchAt, cohort } = useRound();
  const { stats } = useStats();

  // Cohort identity for the deterministic landscape + badge.
  const cohortNumber = cohort?.cohort ?? null;
  const cohortLaunchAt = launchAt ?? null;

  // Isometric camp variant is opt-in via ?camps=1 so the default visual is
  // unchanged and the camp rollout is trivially revertible (drop the param).
  // Reads once on mount; not reactive to URL changes by design.
  const populationVariant = useMemo(() => {
    if (typeof window === "undefined") return "dot";
    return new URLSearchParams(window.location.search).get("camps") === "1"
      ? "camp"
      : "dot";
  }, []);

  // Depth parallax is opt-in via ?parallax=1 (device orientation / mouse).
  // Respects prefers-reduced-motion inside the hook; default off keeps the
  // DOM unchanged.
  const parallax = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("parallax") === "1";
  }, []);

  // Population data for the backdrop
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

  return (
    <div
      className={`relative h-[100svh] max-h-[100svh] flex flex-col font-body overflow-hidden bg-transparent ${className}`}
      style={
        padTop
          ? {
              paddingTop: "env(safe-area-inset-top, 0px)",
            }
          : undefined
      }
    >
      <AmbientBackdrop
        phase={phase}
        flourishes={flourishes}
        ember={ember}
        populationCount={populationCount}
        populationTotal={populationTotal}
        populationWinner={populationWinner}
        currentDay={currentDay}
        checkinOpensAt={round?.opensAt ?? null}
        checkinClosesAt={round?.closesAt ?? null}
        populationVariant={populationVariant}
        cohortNumber={cohortNumber}
        cohortLaunchAt={cohortLaunchAt}
        parallax={parallax}
      />
      {children}
      {/* Landscape identity stamp — subtle, bottom-left, above the nav.
          Deterministic per cohort; null (renders nothing) before launch. */}
      <div className="pointer-events-none absolute left-4 bottom-[5.75rem] z-10 hidden min-[480px]:block">
        <LandscapeBadge cohortNumber={cohortNumber} cohortLaunchAt={cohortLaunchAt} />
      </div>
    </div>
  );
}

/** Shared bottom offset: BottomNav height (~64px) + safe-area. Use on scroll regions. */
export const SHELL_BOTTOM_PAD =
  "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]";

/** Composer / sticky footer above BottomNav */
export const SHELL_ABOVE_NAV =
  "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]";
