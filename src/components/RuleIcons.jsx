/**
 * Custom SVG icons for the 4 rules. Each is 48x48, drawn in
 * the brand palette (amber accent, blood red, dim text). Using
 * custom SVGs instead of emojis gives us:
 *   - Cross-platform consistency (no iOS vs Android emoji drift)
 *   - Brand consistency with the mascot's red+amber palette
 *   - Easier to animate (we can stroke-dasharray things)
 *
 * Each icon is a small React component that takes a `glow` prop
 * for the active state.
 */

const STROKE = "#FFB800";
const STROKE_DIM = "#FFB80080";
const FILL = "#FF1A1A";
const BG = "#FFB80014";

function SvgWrap({ children, glow = false }) {
  return (
    <div className="relative shrink-0">
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-amber-500/30 blur-xl" />
      )}
      <svg
        viewBox="0 0 48 48"
        className="w-12 h-12 relative"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {children}
      </svg>
    </div>
  );
}

export function IconReserve({ glow }) {
  return (
    <SvgWrap glow={glow}>
      <circle cx="24" cy="24" r="20" fill={BG} />
      <circle cx="24" cy="24" r="20" stroke={STROKE_DIM} strokeWidth="1" strokeDasharray="2 3" />
      {/* Ticket body */}
      <path
        d="M14 18 L34 18 L34 30 L14 30 Z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Notch */}
      <path d="M20 18 V30 M28 18 V30" stroke="#0a0a0a" strokeWidth="1" strokeDasharray="2 2" />
      {/* Star punch */}
      <circle cx="24" cy="24" r="2" fill={STROKE} />
    </SvgWrap>
  );
}

export function IconTheme({ glow }) {
  return (
    <SvgWrap glow={glow}>
      <circle cx="24" cy="24" r="20" fill={BG} />
      {/* Crosshair */}
      <circle cx="24" cy="24" r="10" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="24" cy="24" r="4" stroke={STROKE} strokeWidth="1.5" />
      <line x1="24" y1="6" x2="24" y2="14" stroke={STROKE} strokeWidth="1.5" />
      <line x1="24" y1="34" x2="24" y2="42" stroke={STROKE} strokeWidth="1.5" />
      <line x1="6" y1="24" x2="14" y2="24" stroke={STROKE} strokeWidth="1.5" />
      <line x1="34" y1="24" x2="42" y2="24" stroke={STROKE} strokeWidth="1.5" />
      {/* Pin in the center */}
      <circle cx="24" cy="24" r="2" fill={FILL} />
    </SvgWrap>
  );
}

export function IconProve({ glow }) {
  return (
    <SvgWrap glow={glow}>
      <circle cx="24" cy="24" r="20" fill={BG} />
      {/* Camera body */}
      <rect x="12" y="16" width="24" height="18" rx="3" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
      {/* Lens */}
      <circle cx="24" cy="25" r="6" fill="#0a0a0a" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="24" cy="25" r="3" fill={STROKE} />
      {/* Flash bump */}
      <rect x="20" y="14" width="8" height="3" rx="1" fill={STROKE} />
      {/* Check badge (proved it) */}
      <circle cx="34" cy="32" r="5" fill={STROKE} stroke="#0a0a0a" strokeWidth="1" />
      <path d="M31 32 L33 34 L37 30" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </SvgWrap>
  );
}

export function IconTrophy({ glow }) {
  return (
    <SvgWrap glow={glow}>
      <circle cx="24" cy="24" r="20" fill={BG} />
      {/* Cup */}
      <path
        d="M16 14 L32 14 L31 24 Q31 28 24 28 Q17 28 17 24 Z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Handles */}
      <path d="M16 16 Q11 16 11 21 Q11 24 16 24" stroke={STROKE} strokeWidth="1.5" fill="none" />
      <path d="M32 16 Q37 16 37 21 Q37 24 32 24" stroke={STROKE} strokeWidth="1.5" fill="none" />
      {/* Stem */}
      <path d="M24 28 V32" stroke={STROKE} strokeWidth="1.5" />
      {/* Base */}
      <rect x="18" y="32" width="12" height="3" rx="1" fill={STROKE} />
      <rect x="16" y="35" width="16" height="2" rx="1" fill={STROKE} />
      {/* Star on the cup */}
      <path d="M24 18 L25 21 L28 21 L25.5 22.5 L26.5 25.5 L24 23.5 L21.5 25.5 L22.5 22.5 L20 21 L23 21 Z" fill={STROKE} />
    </SvgWrap>
  );
}
