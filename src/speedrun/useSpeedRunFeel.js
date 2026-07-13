import { useCallback } from "react";
import { useDelight } from "../components/DelightProvider.jsx";
import { playCue, CUE_PRESS, CUE_HOVER } from "../lib/cuelume.js";

/**
 * Speed-run feel layer — uses the shared app Cuelume bind
 * (DelightProvider / useSound) + confetti on story peaks.
 */
export function useSpeedRunFeel() {
  const { playSound, celebrate, soundEnabled, toggleSound } = useDelight();

  const cue = useCallback((name) => {
    if (!soundEnabled) return;
    playCue(name);
  }, [soundEnabled]);

  /** Story beat moments — cuelume character + confetti when it matters. */
  const beatFeel = useCallback((kind) => {
    switch (kind) {
      case "advance":
        cue("tick");
        break;
      case "reveal":
        cue("bloom");
        break;
      case "checkin":
        cue("success");
        celebrate?.(12);
        break;
      case "vote-human":
        cue("chime");
        break;
      case "vote-sus":
        cue("press");
        break;
      case "cut":
        cue("droplet");
        break;
      case "infiltrator-unlock":
        cue("sparkle");
        break;
      case "fooled":
        cue("sparkle");
        celebrate?.(24);
        break;
      case "caught":
        cue("droplet");
        break;
      case "honest":
        cue("success");
        break;
      case "pressure":
        cue("whisper");
        break;
      case "wildcard":
        cue("bloom");
        break;
      case "revive":
        cue("sparkle");
        celebrate?.(20);
        break;
      case "finale":
        cue("success");
        celebrate?.(36);
        break;
      case "share":
        cue("success");
        break;
      default:
        cue("tick");
    }
  }, [cue, celebrate]);

  return { cue, beatFeel, soundEnabled, toggleSound, celebrate, playSound };
}

export { CUE_PRESS, CUE_HOVER };
