// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mulberry32 } from "../src/lib/rng.js";
import {
  daylightTemp,
  tempToColor,
  computeTimeOfDay,
} from "../src/lib/daylight.js";
import { isoFaces } from "../src/components/ui/isometric-shade.js";
import {
  deriveLandscapeSeed,
  getLandscapeProfile,
  landscapeName,
} from "../src/lib/landscape.js";
import {
  isRealOrientationEvent,
  orientationToShift,
  mouseToShift,
  MAX_SHIFT_PX,
} from "../src/lib/parallaxMath.js";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = Array.from({ length: 5 }, () => mulberry32(1)());
    const b = Array.from({ length: 5 }, () => mulberry32(2)());
    expect(a).not.toEqual(b);
  });

  it("always returns floats in [0, 1)", () => {
    const rng = mulberry32(1234);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("daylightTemp", () => {
  it("clamps dayOfWeek into range", () => {
    expect(daylightTemp(-1, 0.5)).toBe(daylightTemp(0, 0.5));
    expect(daylightTemp(99, 0.5)).toBe(daylightTemp(4, 0.5));
  });

  it("clamps timeOfDay into [0,1]", () => {
    expect(daylightTemp(2, -1)).toBe(daylightTemp(2, 0));
    expect(daylightTemp(2, 5)).toBe(daylightTemp(2, 1));
  });

  it("returns a value in [0,1]", () => {
    for (let d = 0; d < 5; d++) {
      for (let t = 0; t <= 1; t += 0.1) {
        const v = daylightTemp(d, t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("sin curve peaks at noon; evening boost warms the late window", () => {
    const dawn = daylightTemp(0, 0.05);
    const noon = daylightTemp(0, 0.5);
    const eveBoostStart = daylightTemp(0, 0.7);
    const eve = daylightTemp(0, 0.95);
    // Sin rises from dawn to noon.
    expect(noon).toBeGreaterThan(dawn);
    // The evening warm-up (after 70% of the window) makes late-day warmer
    // than the moment the boost begins, even as the sin curve falls.
    expect(eve).toBeGreaterThan(eveBoostStart);
  });
});

describe("tempToColor", () => {
  it("produces valid rgba() strings", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(tempToColor(t)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.12\)$/);
    }
  });

  it("clamps out-of-range input", () => {
    expect(tempToColor(-5)).toBe(tempToColor(0));
    expect(tempToColor(99)).toBe(tempToColor(1));
  });

  it("cool at 0 is bluer than warm at 0.5", () => {
    const cool = tempToColor(0);
    const warm = tempToColor(0.5);
    const coolB = Number(cool.match(/rgba\(\d+, \d+, (\d+),/)[1]);
    const warmB = Number(warm.match(/rgba\(\d+, \d+, (\d+),/)[1]);
    expect(coolB).toBeGreaterThan(warmB);
  });
});

describe("computeTimeOfDay", () => {
  const open = "2024-01-01T08:00:00.000Z";
  const close = "2024-01-01T20:00:00.000Z";

  it("returns null when window is missing", () => {
    expect(computeTimeOfDay(null, close)).toBeNull();
    expect(computeTimeOfDay(open, null)).toBeNull();
  });

  it("returns null for an invalid/inverted window", () => {
    expect(computeTimeOfDay(open, open)).toBeNull();
    expect(computeTimeOfDay(close, open)).toBeNull();
    expect(computeTimeOfDay("not-a-date", close)).toBeNull();
  });

  it("returns 0 before the window opens", () => {
    expect(computeTimeOfDay(open, close, Date.parse(open) - 1000)).toBe(0);
  });

  it("returns 1 after the window closes", () => {
    expect(computeTimeOfDay(open, close, Date.parse(close) + 1000)).toBe(1);
  });

  it("returns the elapsed fraction mid-window", () => {
    const mid = Date.parse(open) + (Date.parse(close) - Date.parse(open)) / 2;
    expect(computeTimeOfDay(open, close, mid)).toBeCloseTo(0.5, 5);
  });
});

describe("isoFaces", () => {
  it("returns three distinct hex faces", () => {
    const faces = isoFaces("#F4B84A");
    expect(faces.top).toBe("#F4B84A");
    expect(faces.left).toMatch(/^#[0-9a-f]{6}$/);
    expect(faces.right).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("highlight (left) is lighter than shadow (right)", () => {
    const faces = isoFaces("#F4B84A", 0.62, 1.15);
    const litL = parseInt(faces.left.slice(1, 3), 16) +
      parseInt(faces.left.slice(3, 5), 16) +
      parseInt(faces.left.slice(5, 7), 16);
    const shadL = parseInt(faces.right.slice(1, 3), 16) +
      parseInt(faces.right.slice(3, 5), 16) +
      parseInt(faces.right.slice(5, 7), 16);
    expect(litL).toBeGreaterThan(shadL);
  });

  it("clamps lightness so factors never overflow to invalid hex", () => {
    // A near-white base with a large highlight factor must still be valid hex.
    const faces = isoFaces("#FFFFFE", 0.5, 3.0);
    expect(faces.left).toMatch(/^#[0-9a-f]{6}$/);
    expect(faces.right).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("deriveLandscapeSeed", () => {
  it("is deterministic for the same cohort metadata", () => {
    expect(deriveLandscapeSeed(1, 1700000000000)).toBe(deriveLandscapeSeed(1, 1700000000000));
  });

  it("differs across cohorts", () => {
    expect(deriveLandscapeSeed(1, 1700000000000)).not.toBe(deriveLandscapeSeed(2, 1700000000000));
  });

  it("differs across launch times for the same cohort number", () => {
    expect(deriveLandscapeSeed(1, 1700000000000)).not.toBe(deriveLandscapeSeed(1, 1800000000000));
  });

  it("returns a non-negative integer", () => {
    const s = deriveLandscapeSeed(3, 1700000000000);
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it("tolerates missing/non-finite inputs without throwing", () => {
    expect(() => deriveLandscapeSeed(null, null)).not.toThrow();
    expect(() => deriveLandscapeSeed("x", "bad")).not.toThrow();
  });
});

describe("getLandscapeProfile", () => {
  it("returns fields in the documented ranges", () => {
    const p = getLandscapeProfile(deriveLandscapeSeed(1, 1700000000000));
    expect(p.topoSeed).toBeGreaterThanOrEqual(100);
    expect(p.topoSeed).toBeLessThan(300);
    expect(p.emberCx).toBeGreaterThanOrEqual(30);
    expect(p.emberCx).toBeLessThanOrEqual(70);
    expect(p.emberCy).toBeGreaterThanOrEqual(20);
    expect(p.emberCy).toBeLessThanOrEqual(50);
    expect(["warm", "cool"]).toContain(p.colorBias);
  });

  it("is deterministic per seed", () => {
    const a = getLandscapeProfile(42);
    const b = getLandscapeProfile(42);
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = getLandscapeProfile(42);
    const b = getLandscapeProfile(43);
    expect(a).not.toEqual(b);
  });

  it("exposes a motifSeed distinct from popSeed", () => {
    const p = getLandscapeProfile(7);
    expect(p).toHaveProperty("motifSeed");
    expect(typeof p.motifSeed).toBe("number");
    expect(p.motifSeed).not.toBe(p.popSeed);
  });
});

describe("landscapeName", () => {
  it("returns a 'Name-Number' string", () => {
    expect(landscapeName(7)).toMatch(/^[A-Z][a-z]+-\d+$/);
  });

  it("is deterministic per seed", () => {
    expect(landscapeName(12345)).toBe(landscapeName(12345));
  });

  it("handles zero and negatives without throwing", () => {
    expect(landscapeName(0)).toMatch(/^[A-Z][a-z]+-\d+$/);
    expect(landscapeName(-5)).toMatch(/^[A-Z][a-z]+-\d+$/);
  });
});

describe("isRealOrientationEvent", () => {
  it("rejects null/undefined", () => {
    expect(isRealOrientationEvent(null)).toBe(false);
    expect(isRealOrientationEvent(undefined)).toBe(false);
  });

  it("rejects the desktop-Chrome all-null event (the bug case)", () => {
    expect(isRealOrientationEvent({ alpha: null, beta: null, gamma: null })).toBe(false);
  });

  it("accepts an event with any real axis", () => {
    expect(isRealOrientationEvent({ alpha: 0, beta: null, gamma: null })).toBe(true);
    expect(isRealOrientationEvent({ alpha: null, beta: 10, gamma: null })).toBe(true);
    expect(isRealOrientationEvent({ alpha: null, beta: null, gamma: 5 })).toBe(true);
  });
});

describe("orientationToShift", () => {
  it("maps tilt to px and clamps to ±MAX_SHIFT_PX", () => {
    expect(orientationToShift(0, 0)).toEqual({ x: 0, y: 0 });
    // 45° tilt → full shift
    expect(orientationToShift(45, 45)).toEqual({ x: MAX_SHIFT_PX, y: MAX_SHIFT_PX });
    expect(orientationToShift(-45, -45)).toEqual({ x: -MAX_SHIFT_PX, y: -MAX_SHIFT_PX });
  });

  it("clamps extreme tilt to the max shift", () => {
    const s = orientationToShift(180, 90);
    expect(Math.abs(s.x)).toBeLessThanOrEqual(MAX_SHIFT_PX);
    expect(Math.abs(s.y)).toBeLessThanOrEqual(MAX_SHIFT_PX);
  });

  it("treats null axes as 0", () => {
    expect(orientationToShift(null, null)).toEqual({ x: 0, y: 0 });
  });
});

describe("mouseToShift", () => {
  it("is zero at viewport center", () => {
    expect(mouseToShift(500, 500, 1000, 1000)).toEqual({ x: 0, y: 0 });
  });

  it("reaches ±MAX_SHIFT_PX at the viewport edges", () => {
    expect(mouseToShift(0, 0, 1000, 1000)).toEqual({ x: -MAX_SHIFT_PX, y: -MAX_SHIFT_PX });
    expect(mouseToShift(1000, 1000, 1000, 1000)).toEqual({ x: MAX_SHIFT_PX, y: MAX_SHIFT_PX });
  });

  it("clamps beyond the viewport", () => {
    const s = mouseToShift(-50, -50, 1000, 1000);
    expect(s).toEqual({ x: -MAX_SHIFT_PX, y: -MAX_SHIFT_PX });
  });
});
