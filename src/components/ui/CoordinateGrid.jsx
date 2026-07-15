/**
 * CoordinateGrid — a faint map grid for the desktop backdrop.
 *
 * Map grid coordinates (A-H, 1-8) faintly marked around the edges.
 * Reinforces the map identity of the backdrop. Very subtle — 5%
 * opacity, thin lines. Gives the gutters structural character that's
 * unique to a geography-based game.
 *
 * Renders as an inline SVG with horizontal and vertical grid lines
 * plus letter/number labels at the edges. Only meaningful on desktop
 * where there's space to see it.
 */
export default function CoordinateGrid({
  opacity = 0.05,
  stroke = "#E7DDC6",
  divisions = 8,
}) {
  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const step = 100 / divisions;

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity }}
    >
      {/* Vertical lines */}
      {Array.from({ length: divisions + 1 }).map((_, i) => (
        <line
          key={`v-${i}`}
          x1={i * step}
          y1="0"
          x2={i * step}
          y2="100"
          stroke={stroke}
          strokeWidth="0.08"
        />
      ))}
      {/* Horizontal lines */}
      {Array.from({ length: divisions + 1 }).map((_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * step}
          x2="100"
          y2={i * step}
          stroke={stroke}
          strokeWidth="0.08"
        />
      ))}
      {/* Column labels (top edge) */}
      {cols.map((label, i) => (
        <text
          key={`col-${label}`}
          x={i * step + step / 2}
          y="3"
          textAnchor="middle"
          fontFamily="'DM Mono', monospace"
          fontSize="1.2"
          fill={stroke}
          opacity="0.6"
        >
          {label}
        </text>
      ))}
      {/* Row labels (left edge) */}
      {Array.from({ length: divisions }).map((_, i) => (
        <text
          key={`row-${i}`}
          x="1.5"
          y={i * step + step / 2 + 0.5}
          textAnchor="middle"
          fontFamily="'DM Mono', monospace"
          fontSize="1.2"
          fill={stroke}
          opacity="0.6"
        >
          {i + 1}
        </text>
      ))}
    </svg>
  );
}
