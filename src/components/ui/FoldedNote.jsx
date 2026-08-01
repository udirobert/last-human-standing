/** Compact folded sticky — Manus backdrop pass motif (day 2). */
export default function FoldedNote({ size = 42, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 10 L30 6 L36 28 L10 34 Z"
        fill="#e8dcc8"
        opacity="0.85"
      />
      <path d="M30 6 L36 12 L30 14 Z" fill="#c4b49a" opacity="0.9" />
      <path
        d="M12 16 Q18 15 24 17 M11 21 Q17 20 23 22 M12 26 Q16 25 20 27"
        fill="none"
        stroke="#3a2a1c"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <ellipse cx="20" cy="36" rx="12" ry="2.5" fill="#2a1c14" opacity="0.18" />
    </svg>
  );
}
