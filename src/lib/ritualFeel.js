/**
 * Shared sound + haptic choreography for the daily ritual.
 * One map for speed-run and live game so Day 1–5 feel like one language.
 */
import { playCue } from "./cuelume.js";
import { haptic } from "./haptics.js";

/** @typedef {'reveal'|'snap'|'submit'|'seal'|'tally'|'voteHuman'|'voteSus'|'survive'|'eliminate'|'cut'|'pressure'|'wildcard'|'revive'|'finale'|'share'|'advance'|'honest'|'fooled'|'caught'|'infiltrator'} RitualKind */

/** @type {Record<RitualKind, { cue: string, haptic: 'success'|'warning'|'error'|'light'|'medium'|'heavy' }>} */
export const RITUAL = {
  reveal: { cue: "bloom", haptic: "medium" },
  snap: { cue: "press", haptic: "light" },
  submit: { cue: "success", haptic: "success" },
  seal: { cue: "whisper", haptic: "light" },
  tally: { cue: "tick", haptic: "light" },
  voteHuman: { cue: "chime", haptic: "light" },
  voteSus: { cue: "press", haptic: "warning" },
  survive: { cue: "success", haptic: "success" },
  eliminate: { cue: "droplet", haptic: "error" },
  cut: { cue: "droplet", haptic: "medium" },
  pressure: { cue: "whisper", haptic: "light" },
  wildcard: { cue: "bloom", haptic: "medium" },
  revive: { cue: "sparkle", haptic: "success" },
  finale: { cue: "success", haptic: "success" },
  share: { cue: "success", haptic: "light" },
  advance: { cue: "tick", haptic: "light" },
  honest: { cue: "success", haptic: "light" },
  fooled: { cue: "sparkle", haptic: "success" },
  caught: { cue: "droplet", haptic: "warning" },
  infiltrator: { cue: "sparkle", haptic: "medium" },
};

/**
 * Fire cue + haptic for a ritual moment.
 * @param {RitualKind | string} kind
 * @param {{ sound?: boolean, haptic?: boolean }} [opts]
 */
export function ritualFeel(kind, opts = {}) {
  const { sound = true, haptic: doHaptic = true } = opts;
  const entry = RITUAL[kind] || RITUAL.advance;
  if (sound) playCue(entry.cue);
  if (doHaptic) haptic(entry.haptic);
}
