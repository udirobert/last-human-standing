import { useEffect, useRef } from "react";
import {
  hasLocalScreenState,
  fetchServerScreen,
  saveServerScreen,
} from "../lib/serverScreen.js";

/**
 * useServerScreenSync — keeps the server's last_screen in sync with the
 * client's screen, and restores from the server when localStorage was wiped
 * (embedded World App / Farcaster webviews).
 *
 * - On mount: if this device has NO local screen state, fetch /api/me and
 *   restore lastScreen if it's a valid screen. Otherwise local wins.
 * - On screen/navTab change: debounced PUT so the server mirrors position.
 *
 * @param {object} opts
 * @param {string} opts.screen     current screen (from useScreenState)
 * @param {string} opts.navTab     current nav tab
 * @param {(s:string)=>void} opts.setScreen
 * @param {string[]} opts.validScreens  allowed screens to restore into
 */
export function useServerScreenSync({ screen, navTab, setScreen, validScreens = [] }) {
  const restoredRef = useRef(false);
  const lastSavedRef = useRef("");

  // 1. Restore on mount ONLY when local storage is absent (wiped/embedded).
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (hasLocalScreenState()) {
      restoredRef.current = true;
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const remote = await fetchServerScreen();
      if (cancelled || !remote) return;
      const ok = validScreens.length === 0 || validScreens.includes(remote);
      if (ok && typeof setScreen === "function") setScreen(remote);
      restoredRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Mirror position to the server (debounced).
  useEffect(() => {
    const key = `${screen}:${navTab}`;
    if (lastSavedRef.current === key) return;
    const t = setTimeout(() => {
      lastSavedRef.current = key;
      saveServerScreen(screen, navTab);
    }, 1200);
    return () => clearTimeout(t);
  }, [screen, navTab]);
}

export default useServerScreenSync;