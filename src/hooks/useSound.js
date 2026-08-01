import { useEffect, useCallback, useState } from "react";
import {
  ensureCuelumeBound,
  playCue,
  setCuelumeEnabled,
} from "../lib/cuelume.js";

/**
 * App sound preference + playback.
 *
 * Micro-interactions: Cuelume (bind once; playCue / data-cuelume-*).
 * Optional ambient drone kept local (no Cuelume equivalent).
 */
export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem("sound_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [ambient, setAmbient] = useState(null);

  useEffect(() => {
    setCuelumeEnabled(enabled);
  }, [enabled]);

  const play = useCallback((soundName) => {
    if (!enabled) return;
    // Lazy-bind on first intentional play (post-gesture), not on mount.
    ensureCuelumeBound();
    playCue(soundName);
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sound_enabled", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const startAmbient = useCallback(() => {
    if (!enabled || ambient) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.connect(ctx.destination);
      const oscillators = [55, 110, 165].map((freq) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(180, ctx.currentTime);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(filter);
        filter.connect(gain);
        osc.start();
        return osc;
      });
      setAmbient({
        ctx,
        stop: () => {
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          oscillators.forEach((o) => {
            try { o.stop(ctx.currentTime + 0.4); } catch { /* ignore */ }
          });
        },
      });
    } catch (e) {
      console.warn("Ambient sound failed:", e);
    }
  }, [enabled, ambient]);

  const stopAmbient = useCallback(() => {
    if (ambient) {
      ambient.stop();
      setAmbient(null);
    }
  }, [ambient]);

  useEffect(() => {
    return () => {
      if (ambient) ambient.stop();
    };
  }, [ambient]);

  return {
    play,
    toggle,
    enabled,
    startAmbient,
    stopAmbient,
  };
}

export function useInitSound() {
  const init = useCallback(() => {
    ensureCuelumeBound();
  }, []);
  return init;
}
