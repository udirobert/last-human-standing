// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  detectEliminationWhileAway,
  computeDaysAway,
  missedDayNumbers,
  KEY as RETURN_KEY,
} from "../src/lib/returnState.js";
import {
  readLocalScreenState,
  hasLocalScreenState,
} from "../src/lib/serverScreen.js";

describe("returnState KEY", () => {
  it("is a stable versioned key", () => {
    expect(RETURN_KEY).toBe("lhs_return_state_v1");
  });
});

describe("detectEliminationWhileAway", () => {
  it("returns true when alive → eliminated", () => {
    expect(
      detectEliminationWhileAway(
        { status: "alive", day: 3 },
        { status: "eliminated", day: 4 },
      ),
    ).toBe(true);
  });

  it("returns false when alive → alive", () => {
    expect(
      detectEliminationWhileAway(
        { status: "alive", day: 3 },
        { status: "alive", day: 4 },
      ),
    ).toBe(false);
  });

  it("returns false when already eliminated → eliminated", () => {
    expect(
      detectEliminationWhileAway(
        { status: "eliminated", day: 1 },
        { status: "eliminated", day: 5 },
      ),
    ).toBe(false);
  });

  it("returns false when prev is null/undefined (first ever visit)", () => {
    expect(detectEliminationWhileAway(null, { status: "alive", day: 1 })).toBe(false);
    expect(detectEliminationWhileAway(undefined, { status: "eliminated", day: 1 })).toBe(false);
  });
});

describe("computeDaysAway", () => {
  it("returns 0 when no day history", () => {
    expect(computeDaysAway(null, 5)).toBe(0);
    expect(computeDaysAway(undefined, 5)).toBe(0);
    expect(computeDaysAway(3, null)).toBe(0);
    expect(computeDaysAway("x", "y")).toBe(0);
  });

  it("returns 0 when on the same day", () => {
    expect(computeDaysAway(3, 3)).toBe(0);
  });

  it("returns the positive difference when day advanced", () => {
    expect(computeDaysAway(3, 5)).toBe(2);
  });

  it("never goes negative for a day rewind", () => {
    expect(computeDaysAway(5, 3)).toBe(0);
  });

  it("handles string numbers", () => {
    expect(computeDaysAway("2", "4")).toBe(2);
  });
});

describe("missedDayNumbers", () => {
  it("returns the days strictly between last-seen and today", () => {
    expect(missedDayNumbers(2, 5)).toEqual([3, 4]);
  });

  it("returns [] for same-day or earlier", () => {
    expect(missedDayNumbers(5, 5)).toEqual([]);
    expect(missedDayNumbers(5, 2)).toEqual([]);
  });

  it("returns [] when missing inputs", () => {
    expect(missedDayNumbers(null, 4)).toEqual([]);
    expect(missedDayNumbers(2, null)).toEqual([]);
  });

  it("returns [] for an implausibly large gap (safety)", () => {
    expect(missedDayNumbers(1, 2000)).toEqual([]);
  });
});

describe("serverScreen localStorage helpers", () => {
  const KEY = "lhs_screen_state_v1";
  beforeEach(() => {
    try { window.localStorage.clear(); } catch { /* jsdom */ }
  });

  it("readLocalScreenState returns null when empty", () => {
    expect(readLocalScreenState()).toBeNull();
    expect(hasLocalScreenState()).toBe(false);
  });

  it("parses a valid persisted screen", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ screen: "feed", navTab: "feed" }));
    expect(readLocalScreenState()).toBe("feed");
    expect(hasLocalScreenState()).toBe(true);
  });

  it("returns null for garbage / malformed state", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(readLocalScreenState()).toBeNull();
    window.localStorage.setItem(KEY, JSON.stringify({ navTab: "home" })); // no screen
    expect(readLocalScreenState()).toBeNull();
  });
});
