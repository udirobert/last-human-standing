import { CUE_PRESS, CUE_HOVER } from "../../lib/cuelume.js";

/**
 * Shared CTAs — one dialect for landing, live game, and speed-run.
 * HumanCta = warm conversion (LandingHero). GameCta = system actions.
 */

export function HumanCta({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...CUE_PRESS}
      className={`w-full max-w-sm font-body font-semibold text-[#1a1206] bg-amber rounded-2xl px-7 py-4 active:scale-[0.97] transition-transform disabled:opacity-40 disabled:pointer-events-none ${className}`}
      style={{ fontSize: "clamp(15px,1.6vw,17px)", boxShadow: "0 10px 30px -8px rgba(255,184,0,0.5)" }}
    >
      {children}
    </button>
  );
}

export function GameCta({ children, onClick, disabled, tone = "blood", className = "", type = "button" }) {
  const tones = {
    blood: "bg-blood text-bone",
    amber: "bg-amber text-ash",
    neon: "bg-neon text-ash",
    ghost: "bg-smoke border border-ember text-bone",
    purple: "bg-purple-600 text-bone",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...CUE_PRESS}
      {...CUE_HOVER}
      className={`w-full max-w-sm py-4 rounded-2xl font-body font-semibold active:scale-[0.97] transition-transform disabled:opacity-40 disabled:pointer-events-none ${tones[tone] || tones.blood} ${className}`}
      style={{ fontSize: "clamp(15px,1.6vw,17px)" }}
    >
      {children}
    </button>
  );
}

export function GhostLink({ children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...CUE_PRESS}
      className={`font-mono text-dim text-xs underline decoration-dotted underline-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}
