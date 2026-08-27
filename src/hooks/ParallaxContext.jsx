import { createContext, useContext } from "react";
import { useParallaxDepth } from "./useParallaxDepth.jsx";

/**
 * Parallax depth layering for the ambient backdrop.
 *
 * Lattice insight: depth is a function of viewpoint shift. A single
 * useParallaxDepth signal (two MotionValues, driven by device orientation
 * or mouse) is scaled per-layer by a `depth` factor and applied as a GPU-
 * composited transform — so the 7-layer backdrop reads as a physical
 * diorama behind glass, not stacked SVG.
 *
 * Lives in src/hooks (not src/components/ui) so the react-refresh
 * only-export-components rule is relaxed for the context + hook exports here.
 * The pure ParallaxLayer component lives in src/components/ui/ParallaxLayer.jsx.
 *
 * MotionValues (not CSS custom properties / calc() strings) drive the
 * transform — no rAF loop. When reduced-motion or no input is active the
 * MotionValues are 0, so layers are perfectly static (zero cost).
 */

export const ParallaxContext = createContext(null);

/**
 * Runs useParallaxDepth once and provides the MotionValues via context.
 * Wrap the backdrop's layer stack. `enabled` gates the whole system.
 */
export function ParallaxProvider({ enabled = true, children }) {
  const { x, y, hasSensor, permissionState, requestOrientationPermission } =
    useParallaxDepth(enabled);
  return (
    <ParallaxContext.Provider
      value={{ x, y, hasSensor, permissionState, requestOrientationPermission }}
    >
      {children}
    </ParallaxContext.Provider>
  );
}

/** Hook for consumers that want the raw signal (e.g. a permission button). */
export function useParallax() {
  return useContext(ParallaxContext);
}
