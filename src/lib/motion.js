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
