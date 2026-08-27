import { useContext } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ParallaxContext } from "../../hooks/ParallaxContext.jsx";

/**
 * ParallaxLayer — wraps any backdrop layer with depth-driven parallax.
 *
 * Inherits the MotionValues from ParallaxContext (provided by
 * ParallaxProvider) and scales by `depth` (0 = far/least move → 1 =
 * near/most move). Negative multiplier gives the "looking through glass"
 * feel: tilt left → scene shifts right.
 *
 * Renders as an `absolute inset-0` containing block so absolutely-positioned
 * children keep their positioning relative to the layer, then applies the
 * depth-scaled translate as a GPU-composited transform.
 *
 * Hooks are called unconditionally (a zero fallback MotionValue is used when
 * no provider is present), so this is safe under rules-of-hooks. Without a
 * provider the transform stays 0 — i.e. a plain passthrough wrapper.
 *
 * @param {object} props
 * @param {number} props.depth  0 (far) .. 1 (near). Clamped to [0, 1].
 * @param {string} [props.className]  defaults to "absolute inset-0"
 * @param {React.ReactNode} props.children
 */
export default function ParallaxLayer({
  depth = 0.5,
  className = "absolute inset-0",
  style = {},
  children,
}) {
  const ctx = useContext(ParallaxContext);
  // Zero fallbacks so useTransform always receives a MotionValue, keeping
  // hook order stable regardless of whether a provider is mounted.
  const fallbackX = useMotionValue(0);
  const fallbackY = useMotionValue(0);
  const x = ctx ? ctx.x : fallbackX;
  const y = ctx ? ctx.y : fallbackY;
  const d = Math.max(0, Math.min(1, depth));
  const dx = useTransform(x, (v) => v * d * -1);
  const dy = useTransform(y, (v) => v * d * -1);

  if (!ctx) return <div className={className} style={style}>{children}</div>;

  return (
    <motion.div className={className} style={{ ...style, x: dx, y: dy, willChange: "transform" }}>
      {children}
    </motion.div>
  );
}
