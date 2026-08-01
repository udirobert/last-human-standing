import { useEffect, useCallback, useState, useRef } from "react";
import {
  ensureCuelumeBound,
  playCue,
  setCuelumeEnabled,
} from "../lib/cuelume.js";

const SOUND_KEY = "sound_enabled";
const BGM_VOL = 0.28;

/**
 * App sound preference + playback.
 *
 * Micro-interactions: Cuelume (bind once; playCue / data-cuelume-*).
 * Background music: HTMLAudio playlist from /api/music (ElevenLabs stems),
 * with a soft local drone fallback when stems aren't ready.
 */
export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [stationTitle, setStationTitle] = useState(null);
  const ambientRef = useRef(null);
  const audioRef = useRef(null);
  const stationIdRef = useRef(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    setCuelumeEnabled(enabled);
  }, [enabled]);

  const stopDrone = useCallback(() => {
    if (ambientRef.current) {
      try {
        ambientRef.current.stop();
      } catch {
        /* ignore */
      }
      ambientRef.current = null;
    }
  }, []);

  const stopBgm = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        /* ignore */
      }
    }
    stopDrone();
    stationIdRef.current = null;
  }, [stopDrone]);

  const startDrone = useCallback(() => {
    if (ambientRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.connect(ctx.destination);
      const oscillators = [55, 82.5, 110].map((freq, i) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(160 + i * 20, ctx.currentTime);
        osc.type = i === 1 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(filter);
        filter.connect(gain);
        osc.start();
        return osc;
      });
      ambientRef.current = {
        stop: () => {
          try {
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          } catch {
            /* ignore */
          }
          oscillators.forEach((o) => {
            try {
              o.stop(ctx.currentTime + 0.4);
            } catch {
              /* ignore */
            }
          });
          try {
            ctx.close();
          } catch {
            /* ignore */
          }
        },
      };
      setStationTitle("Ambient drone");
    } catch (e) {
      console.warn("Ambient sound failed:", e);
    }
  }, []);

  const playStation = useCallback(
    async (stationId, title, { force = false } = {}) => {
      if ((!enabled && !force) || !stationId) return;
      if (stationIdRef.current === stationId && audioRef.current && !audioRef.current.paused) {
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
        audioRef.current.preload = "auto";
      }
      const audio = audioRef.current;
      audio.volume = BGM_VOL;

      try {
        stopDrone();
        audio.src = `/api/music/track/${encodeURIComponent(stationId)}`;
        await audio.play();
        stationIdRef.current = stationId;
        setStationTitle(title || stationId);
      } catch {
        // Autoplay blocked or stem missing — soft drone keeps the room alive.
        stationIdRef.current = null;
        startDrone();
      }
    },
    [enabled, startDrone, stopDrone],
  );

  const syncPlaylist = useCallback(
    async ({ phase = "prelaunch", screen = "home", force = false } = {}) => {
      if (!unlockedRef.current) return;
      if (!force && !enabled) return;
      try {
        const resp = await fetch(
          `/api/music/playlist?phase=${encodeURIComponent(phase)}&screen=${encodeURIComponent(screen)}`,
        );
        if (!resp.ok) {
          startDrone();
          return;
        }
        const data = await resp.json();
        const preferred =
          data.stations?.find((s) => s.id === data.preferredId && s.ready) ||
          data.stations?.find((s) => s.ready);
        if (preferred?.url) {
          await playStation(preferred.id, preferred.title, { force });
        } else {
          startDrone();
        }
      } catch {
        startDrone();
      }
    },
    [enabled, playStation, startDrone],
  );

  const unlockAndStart = useCallback(
    (ctx = {}) => {
      unlockedRef.current = true;
      ensureCuelumeBound();
      // Start drone synchronously inside the user gesture so audio unlocks
      // even if the ElevenLabs stem fetch is still in flight.
      startDrone();
      syncPlaylist({ ...ctx, force: true });
    },
    [syncPlaylist, startDrone],
  );

  const play = useCallback(
    (soundName) => {
      if (!enabled) return;
      ensureCuelumeBound();
      playCue(soundName);
    },
    [enabled],
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, String(next));
      } catch {
        /* ignore */
      }
      if (!next) {
        stopBgm();
        setStationTitle(null);
      } else {
        unlockedRef.current = true;
        ensureCuelumeBound();
        startDrone();
        // Upgrade to a composed stem when available (force ignores stale enabled).
        queueMicrotask(() => syncPlaylist({ force: true }));
      }
      return next;
    });
  }, [stopBgm, startDrone, syncPlaylist]);

  // When re-enabled after mute via storage/effects, resume playlist.
  useEffect(() => {
    if (!enabled) {
      stopBgm();
      return undefined;
    }
    return undefined;
  }, [enabled, stopBgm]);

  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, [stopBgm]);

  return {
    play,
    toggle,
    enabled,
    stationTitle,
    unlockAndStart,
    syncPlaylist,
    startAmbient: () => unlockAndStart(),
    stopAmbient: stopBgm,
  };
}

export function useInitSound() {
  const init = useCallback(() => {
    ensureCuelumeBound();
  }, []);
  return init;
}
