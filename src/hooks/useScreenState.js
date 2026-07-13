import { useEffect, useState, useCallback } from "react";

const KEY = "lhs_screen_state_v1";

/**
 * Persistent screen + navTab state. Survives refresh so users don't
 * land back on the Onboarding step 0 every time they reload. The
 * `SCREENS.ONBOARDING` value is the canonical default.
 *
 * Usage:
 *   const { screen, navTab, setScreen, setNavTab, reset } = useScreenState({
 *     defaultScreen: SCREENS.ONBOARDING,
 *     validScreens: Object.values(SCREENS),
 *   });
 */
export function useScreenState({ defaultScreen, validScreens = [] } = {}) {
  const fallback = defaultScreen ?? "onboarding";
  const isValid = useCallback(
    (s) => validScreens.length === 0 || validScreens.includes(s),
    [validScreens],
  );

  const [screen, setScreenRaw] = useState(() => {
    try {
      // Deep links win over persisted state: share landing pages and push
      // notification clicks open /?screen=feed (etc.) to land on the drama.
      // /?demo=1 opens the guided speed-run demo.
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1" && isValid("speedrun")) return "speedrun";

      const urlScreen = params.get("screen");
      if (urlScreen && isValid(urlScreen)) return urlScreen;

      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const s = parsed?.screen ?? fallback;
      return isValid(s) ? s : fallback;
    } catch {
      return fallback;
    }
  });

  const [navTab, setNavTabRaw] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.navTab ?? "home";
    } catch {
      return "home";
    }
  });

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ screen, navTab }));
    } catch {
      /* ignore */
    }
  }, [screen, navTab]);

  const setScreen = useCallback(
    (next) => {
      setScreenRaw(isValid(next) ? next : fallback);
    },
    [isValid, fallback],
  );

  const setNavTab = useCallback((next) => setNavTabRaw(next), []);

  const reset = useCallback(() => {
    setScreenRaw(fallback);
    setNavTabRaw("home");
  }, [fallback]);

  return { screen, navTab, setScreen, setNavTab, reset };
}

/**
 * Clear persisted state — call from a logout path or when the user
 * explicitly wants to reset.
 */
export function clearScreenState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
