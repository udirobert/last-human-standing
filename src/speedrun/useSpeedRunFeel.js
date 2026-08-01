import { useCallback } from "react";
import { useDelight } from "../components/DelightProvider.jsx";
import { playCue, CUE_PRESS, CUE_HOVER } from "../lib/cuelume.js";
import { ritualFeel } from "../lib/ritualFeel.js";

/**
 * Speed-run feel layer — shared ritual map (cue + haptic) + confetti peaks.
 */
export function useSpeedRunFeel() {
  const { celebrate, soundEnabled, toggleSound, playSound } = useDelight();

  const cue = useCallback((name) => {
    if (!soundEnabled) return;
    playCue(name);
  }, [soundEnabled]);

  /** Story beat moments — sound + haptic from one choreography map. */
  const beatFeel = useCallback((kind) => {
    const map = {
      advance: "advance",
      reveal: "reveal",
      checkin: "submit",
      snap: "snap",
      seal: "seal",
      tally: "tally",
      "vote-human": "voteHuman",
      "vote-sus": "voteSus",
      survive: "survive",
      eliminate: "eliminate",
      cut: "cut",
      "infiltrator-unlock": "infiltrator",
      fooled: "fooled",
      caught: "caught",
      honest: "honest",
      pressure: "pressure",
      wildcard: "wildcard",
      revive: "revive",
      finale: "finale",
      share: "share",
    };
    const ritual = map[kind] || "advance";
    ritualFeel(ritual, { sound: soundEnabled });

    if (kind === "checkin") celebrate?.(12);
    if (kind === "fooled") celebrate?.(24);
    if (kind === "revive") celebrate?.(20);
    if (kind === "finale") celebrate?.(36);
    if (kind === "survive") celebrate?.(16);
  }, [soundEnabled, celebrate]);

  return { cue, beatFeel, soundEnabled, toggleSound, celebrate, playSound };
}

export { CUE_PRESS, CUE_HOVER };
