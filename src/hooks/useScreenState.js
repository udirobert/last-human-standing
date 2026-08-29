import { useEffect, useState, useCallback } from "react";
import { SCREEN_KEY, readLocalScreenAndTab, writeLocalScreenState } from "../lib/serverScreen.js";

/** Screens that are mid-flow / special-access — never restore from storage. */
const EPHEMERAL = new Set(["checkin", "admin", "speedrun"]);

/**
 * Persistent screen + navTab state. Survives refresh so users don't
 * land back on the Onboarding step 0 every time they reload. The
 * `SCREENS.ONBOARDING` value is the canonical default.
 *
 * Ephemeral screens (check-in, admin, speedrun) fall back to home /
 * onboarding on restore so a refresh never traps someone mid-flow.
 * Deep links (`?screen=`, `?demo=1`) still win, then are cleared from
 * the URL so a later refresh doesn't re-deep-link oddly.
 */
export function useScreenState({ defaultScreen, validScreens = [] } = {}) {
  const fallback = defaultScreen ?? "onboarding";
  const isValid = useCallback(
    (s) => validScreens.length === 0 || validScreens.includes(s),
    [validScreens],
  );

  const resolveRestored = useCallback(
    (s) => {
      if (!isValid(s)) return fallback;
      if (EPHEMERAL.has(s)) {
        return s === "speedrun" ? fallback : "home";
      }
      return s;
    },
    [isValid, fallback],
  );

  const [screen, setScreenRaw] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1" && isValid("speedrun")) return "speedrun";

      const urlScreen = params.get("screen");
      if (urlScreen && isValid(urlScreen)) return urlScreen;

      const parsed = readLocalScreenAndTab();
      return resolveRestored(parsed?.screen ?? fallback);
    } catch {
      return fallback;
    }
  });

  const [navTab, setNavTabRaw] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlScreen = params.get("screen");
      if (urlScreen === "feed" || urlScreen === "chat" || urlScreen === "leaderboard" || urlScreen === "home") {
        return urlScreen;
      }
      const parsed = readLocalScreenAndTab();
      const tab = parsed?.navTab ?? "home";
      // Don't restore a nav tab that doesn't map to a BottomNav item
      if (tab === "admin" || tab === "history") return "home";
      return tab;
    } catch {
      return "home";
    }
  });

  // Clear one-shot deep-link params after they've been consumed.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let dirty = false;
      if (url.searchParams.has("screen")) {
        url.searchParams.delete("screen");
        dirty = true;
      }
      // Keep ?demo=1 while on speedrun; clear when they leave (handled in App).
      if (dirty) {
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on every change — never write ephemeral screens.
  useEffect(() => {
    const persistScreen = EPHEMERAL.has(screen)
      ? screen === "speedrun"
        ? fallback
        : "home"
      : screen;
    const persistTab =
      navTab === "admin" || navTab === "history" ? "home" : navTab;
    writeLocalScreenState(persistScreen, persistTab);
  }, [screen, navTab, fallback]);

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
    localStorage.removeItem(SCREEN_KEY);
  } catch {
    /* ignore */
  }
}
