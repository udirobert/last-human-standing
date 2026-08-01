/** Compact wilting houseplant — Manus backdrop pass motif (day 4). */
export default function WiltingPlant({ size = 44, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 48"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 30 L30 30 L28 44 L16 44 Z" fill="#8a5a3a" opacity="0.9" />
      <ellipse cx="22" cy="30" rx="9" ry="3" fill="#6b4428" />
      <path
        d="M22 28 C20 20 14 14 10 12"
        fill="none"
        stroke="#5a6b3a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 12 C6 10 4 14 8 16 C10 14 12 13 10 12 Z"
        fill="#6a7a42"
        opacity="0.85"
      />
      <path
        d="M18 18 C22 14 28 16 30 20 C26 22 20 22 18 18 Z"
        fill="#7a8a4a"
        opacity="0.8"
      />
      <ellipse cx="28" cy="40" rx="3.5" ry="1.8" fill="#6a7a42" opacity="0.55" transform="rotate(-20 28 40)" />
    </svg>
  );
}
