/** Shared motion vocabulary for frequent UI and occasional cinematic moments. */
export const MOTION_DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
};

export const MOTION_EASE = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
};

export const MOTION_SPRING = {
  snappy: { type: "spring", duration: MOTION_DURATION.slow, bounce: 0.1 },
  gentle: { type: "spring", duration: 0.5, bounce: 0.15 },
};

/**
 * Entrance props that never hide essential content behind opacity.
 * Motion is a slide/offset enhancement; reduced-motion skips it entirely.
 */
export function entranceMotion(reduce, axis = "y") {
  if (reduce) return { initial: false };
  const from = axis === "x" ? { x: -12 } : { y: 12 };
  const to = axis === "x" ? { x: 0 } : { y: 0 };
  return {
    initial: from,
    whileInView: to,
    viewport: { once: true, amount: 0.2, margin: "0px 0px -24px 0px" },
  };
}
