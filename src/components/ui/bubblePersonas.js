/**
 * The BubbleLoader cast — same soft-body family, distinct souls.
 *
 * Kept separate from BubbleLoader.jsx so the component file only exports a
 * component (React Fast Refresh requirement), matching the RuleIconMap.js /
 * RuleIcons.jsx split.
 *
 * Colors are from the app palette so the whole population still feels like one
 * game. Params:
 *   speed      — global tempo of the motion
 *   spread     — how far blobs swing from center (orbit fraction of size)
 *   viscosity  — 0..1, high = blobs stay fused/gloopy, low = they fly apart & pinch
 *   wobble     — angular jitter, i.e. how "nervous" the orbit is
 */
export const PERSONAS = {
  steady: { count: 4, speed: 1.0, spread: 0.2, viscosity: 0.45, wobble: 0.25, color: "#FF1A1A" }, // calm, grounded (blood)
  bouncy: { count: 5, speed: 1.5, spread: 0.24, viscosity: 0.25, wobble: 0.35, color: "#FFB800" }, // energetic (amber)
  zen: { count: 3, speed: 0.6, spread: 0.16, viscosity: 0.7, wobble: 0.15, color: "#F0EDE8" }, // slow & gloopy (bone)
  spark: { count: 5, speed: 1.9, spread: 0.18, viscosity: 0.35, wobble: 0.5, color: "#00FF94" }, // jittery (neon)
  bold: { count: 3, speed: 0.9, spread: 0.26, viscosity: 0.15, wobble: 0.2, color: "#FF1A1A" }, // few, big, wide (blood)
  tide: { count: 4, speed: 0.75, spread: 0.22, viscosity: 0.55, wobble: 0.4, color: "#FFB800" }, // rolling swells (amber)
};

export const PERSONA_KEYS = Object.keys(PERSONAS);

/** Stable string hash → persona key. Same seed always resolves the same soul. */
export function personaFor(seed) {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PERSONA_KEYS[Math.abs(h) % PERSONA_KEYS.length];
}
