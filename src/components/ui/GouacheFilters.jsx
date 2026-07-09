/**
 * GouacheFilters — the shared "hand" for every human motif (docs/ART_DIRECTION.md).
 *
 * Two SVG filters do the gouache-on-paper look, so a coffee cup and a flower
 * feel painted by the same person:
 *   {id}-brush  — feTurbulence + feDisplacementMap wobbles every edge like a brush
 *   {id}-grain  — warm paper-grain speckle, clip it onto painted fills
 *   {id}-soft   — gentle blur (steam, soft edges)
 *   {id}-shadow — grounding drop shadow
 *
 * Drop it inside an <svg><defs>…</defs>, passing a unique id (useId), then
 * reference the filters as `url(#${id}-brush)` etc.
 */
export default function GouacheFilters({ id }) {
  return (
    <>
      <filter id={`${id}-brush`} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="4" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id={`${id}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.5 0" />
      </filter>
      <filter id={`${id}-soft`}>
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
      <filter id={`${id}-shadow`}>
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </>
  );
}
