import { createPortal } from "react-dom";

/**
 * Render overlays into document.body so they escape screen-root
 * transform containing blocks (framer-motion page transitions) and
 * sit above BottomNav / chrome in a predictable stacking context.
 *
 * Z-scale (docs of intent):
 *   content < 20 · sticky chrome 40 · overlays 70 · system/wallet 80+
 */
export default function OverlayPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
