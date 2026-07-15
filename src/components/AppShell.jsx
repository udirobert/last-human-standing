import AmbientBackdrop from "./AmbientBackdrop.jsx";
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
  const { reservedCount, cohortSize, isEnded, winner } = useRound();
  const { stats } = useStats();

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
      />
      {children}
    </div>
  );
}

/** Shared bottom offset: BottomNav height (~64px) + safe-area. Use on scroll regions. */
export const SHELL_BOTTOM_PAD =
  "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]";

/** Composer / sticky footer above BottomNav */
export const SHELL_ABOVE_NAV =
  "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]";
