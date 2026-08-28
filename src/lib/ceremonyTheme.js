/**
 * Shared ceremony chrome — the one warm-room backdrop every full-screen
 * moment uses (RuleReveal, DayRecap, SpecReveal, GameMoment, DayBriefing…).
 *
 * Before this existed the exact same radial-gradient string was copy-pasted
 * into 6 files. It lives here so the "room" can only be lit one way.
 */

/** The warm lit room — radial from a brown halo down to near-black. */
export const CEREMONY_BG =
  "radial-gradient(120% 90% at 50% 0%, rgba(74,50,33,0.97) 0%, rgba(22,16,12,0.98) 55%, rgba(13,13,13,0.99) 100%)";

/** Safe-area padding so ceremony content clears notches / home bars. */
export const CEREMONY_PAD = {
  paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
  paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
};

/** Eyebrow tone → text color. The small mono kicker above a ceremony title. */
export const EYEBROW_TONES = {
  amber: "text-amber/90",
  neon: "text-neon/80",
  blood: "text-blood/80",
  dim: "text-dim",
  bone: "text-bone/70",
};

/** Title tone → text color for ceremony headlines. */
export const TITLE_TONES = {
  bone: "text-bone",
  amber: "text-amber",
  neon: "text-neon",
  blood: "text-blood",
};
