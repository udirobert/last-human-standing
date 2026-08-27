import { useEffect, useState } from "react";

/**
 * Shared prefers-reduced-motion hook.
 *
 * Previously duplicated as a local `usePrefersReducedMotion` in PopulationField,
 * EmberField, and TopographicTexture. Extracted here so all backdrop layers
 * (and the parallax system) share one implementation — no third ad-hoc copy.
 *
 * SSR-safe: returns false on the first render (window is unavailable), then
 * reconciles to the real media-query value after mount. Identical behavior
 * to the local copies it replaces.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export default usePrefersReducedMotion;
