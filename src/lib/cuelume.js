/**
 * App-wide Cuelume interaction layer.
 * https://cuelume-site.pages.dev/
 *
 * Bind once at boot. Imperative play() maps legacy delight names → Cuelume
 * palette so existing call sites keep working. Prefer data-cuelume-* attrs
 * for micro-interactions so we don't double-fire with playSound('click').
 */
import { bind, play as cuelumePlay, setEnabled as cuelumeSetEnabled } from "cuelume";

let bound = false;

/** Legacy delight names → Cuelume SoundName */
const ALIASES = {
  click: "press",
  success: "success",
  error: "droplet",
  victory: "sparkle",
  tick: "tick",
  // pass-throughs for callers already using Cuelume names
  press: "press",
  release: "release",
  chime: "chime",
  sparkle: "sparkle",
  droplet: "droplet",
  bloom: "bloom",
  whisper: "whisper",
  toggle: "toggle",
};

export function ensureCuelumeBound() {
  if (bound || typeof window === "undefined") return;
  try {
    bind();
    bound = true;
  } catch (e) {
    console.warn("cuelume bind failed:", e);
  }
}

export function setCuelumeEnabled(on) {
  try {
    cuelumeSetEnabled(Boolean(on));
  } catch {
    /* ignore */
  }
}

/**
 * Play a sound by legacy or Cuelume name. No-ops when muted (via setCuelumeEnabled).
 */
export function playCue(name) {
  const mapped = ALIASES[name] || name;
  try {
    cuelumePlay(mapped);
  } catch {
    /* autoplay / SSR */
  }
}

/** Declarative press + release for primary buttons */
export const CUE_PRESS = {
  "data-cuelume-press": "press",
  "data-cuelume-release": "release",
};

/** Soft hover for nav / secondary */
export const CUE_HOVER = {
  "data-cuelume-hover": "tick",
};

/** Toggle / mute */
export const CUE_TOGGLE = {
  "data-cuelume-toggle": "toggle",
};
