/**
 * Three-tone isometric shading from a single hex color.
 *
 * Borrowed from Lattice's @latticekit/draw shade model: shade(c, f) —
 * below 1.0 darkens AND pulls the hue cool (toward blue); above 1.0
 * brightens AND pulls the hue warm (toward amber). The base color is the
 * neutral top face.
 *
 * This is the self-contained visual technique only — no Canvas2D, no game
 * loop, just the color math. Each isometric "camp" is a static SVG whose
 * three faces are derived here.
 */

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / (max - min) + 2) / 6;
        break;
      case b:
        h = ((r - g) / (max - min) + 4) / 6;
        break;
      default:
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Derive three isometric faces from one base hex.
 *
 * @param {string} baseHex          e.g. "#F4B84A"
 * @param {number} [shadowFactor]   lightness multiplier for the shadow face (<1)
 * @param {number} [highlightFactor] lightness multiplier for the lit face (>1)
 * @returns {{ left: string, right: string, top: string }}
 *   left  — lit face (sun from front-left, per Lattice convention)
 *   right — shadow face
 *   top   — base color
 */
export function isoFaces(baseHex, shadowFactor = 0.62, highlightFactor = 1.15) {
  const { h, s, l } = hexToHsl(baseHex);
  // Shadow: darker + cool pull (hue toward blue). Lightness clamped to [0,100].
  const shadowHex = hslToHex(h - 20, s * 1.1, Math.min(100, l * shadowFactor));
  // Highlight: brighter + warm pull (hue toward amber).
  const highlightHex = hslToHex(h + 10, s * 0.9, Math.min(100, l * highlightFactor));
  return {
    left: highlightHex,
    right: shadowHex,
    top: baseHex,
  };
}
