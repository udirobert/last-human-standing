import { ROUND_UNLOCKS, JURY_UNLOCK } from "../lib/copy.js";
import { proofSceneDataUri } from "../components/ui/proofSceneData.js";

/**
 * 5-day speed-run — compressed cohort myth.
 *
 * Spoiler discipline: the demo teaches the FORMAT the real cohort uses
 * (interpretive riddle + committed spec + reveal-then-vote + seed lottery)
 * but with decoy riddles that are NOT cohort 1's actual five (THE GATHERING
 * → THE WILD → THE BOND → THE QUIET → THE DAWN). Mechanics + RuleReveal copy
 * stay real; the riddle content stays a decoy.
 */

export const DEMO_SHARE_URL_PATH = "/?demo=1";

/** Beat ids in order. */
export const SPEEDRUN_BEATS = [
  "intro",
  "d1_reveal",
  "d1_checkin",
  "d1_closing",
  "d1_audit",
  "d1_rank",
  "d1_cut",
  "d2_reveal",
  "d2_path",
  "d2_outcome",
  "d2_cut",
  "d3_reveal",
  "d3_pulse",
  "d3_cut",
  "d4_reveal",
  "d4_jury",
  "d4_revive",
  "d5_reveal",
  "finale",
];

/** Map beat → demo day (for chrome / progress). */
export const BEAT_DAY = {
  intro: 0,
  d1_reveal: 1, d1_checkin: 1, d1_closing: 1, d1_audit: 1, d1_rank: 1, d1_cut: 1,
  d2_reveal: 2, d2_path: 2, d2_outcome: 2, d2_cut: 2,
  d3_reveal: 3, d3_pulse: 3, d3_cut: 3,
  d4_reveal: 4, d4_jury: 4, d4_revive: 4,
  d5_reveal: 5, finale: 5,
};

export const CAP_SCHEDULE = [null, 25, 12, 6, 3, 1];

/**
 * Decoy riddles — same FORMAT as the real cohort (interpretive prompt +
 * committed spec) but none of these are cohort 1's actual five riddles.
 * Each maps to an available proof-scene so the demo photos stay coherent.
 */
export const DEMO_RIDDLES = [
  {
    theme: "THE CROSSING",
    emoji: "🚇",
    description: "A place where everyone is going somewhere else. Show me the in-between.",
    color: "#AA55FF",
    counts: [
      "Bus, train, metro, tram, ferry — you inside",
      "Station platform with you clearly in frame",
      "You mid-journey, the vehicle or stop visible",
    ],
    doesnt: [
      "Private car or rideshare backseat",
      "Stock photo of a train with no you",
      "Just a ticket or map with no human",
    ],
  },
  {
    theme: "THE GRIND",
    emoji: "🏋️",
    description: "Proof you chose something hard today. Show me the effort.",
    color: "#FF6B00",
    counts: [
      "Gym floor, weights, machines — you in frame",
      "Home gym with obvious equipment",
      "Mid-rep or clearly about to work",
    ],
    doesnt: [
      "Athletic clothes on a couch",
      "Yoga mat in a bedroom with no gear",
      "Stock photo of a gym",
    ],
  },
  {
    theme: "THE HARVEST",
    emoji: "🛒",
    description: "A place where food waits to be chosen. Show me the picking.",
    color: "#00FF94",
    counts: [
      "Aisles, produce, checkout — you shopping",
      "Market stall with you choosing",
      "Cart or basket in your hands",
    ],
    doesnt: [
      "Fridge at home",
      "Delivery bag on the doorstep",
      "Receipt only, no store, no you",
    ],
  },
  {
    theme: "THE EDGE",
    emoji: "🌊",
    description: "Where the land gives up. Show me the boundary.",
    color: "#00C8FF",
    counts: [
      "Ocean, lake, river — you + the water",
      "Shoreline with you standing at the edge",
      "Any water body, coastal not required",
    ],
    doesnt: [
      "Glass of water on a desk",
      "Rain on a window only",
      "Stock photo of a beach",
    ],
  },
  {
    theme: "THE TABLE",
    emoji: "🍜",
    description: "Proof you still take time to eat. Show me the meal.",
    color: "#FF6B00",
    counts: [
      "Real food in front of you, you in frame",
      "Mid-bite or clearly about to eat",
      "Restaurant, street food, or home plate",
    ],
    doesnt: [
      "Empty plate",
      "Unopened packaged snack only",
      "Food photo with no human presence",
    ],
  },
];

/**
 * Decoy riddle days — none of these are in cohort 1's real drop order
 * (THE GATHERING → THE WILD → THE BOND → THE QUIET → THE DAWN).
 */
export const DEMO_DAYS = {
  1: {
    day: 1,
    theme: DEMO_RIDDLES[0],
    samplePhoto: proofSceneDataUri({ scene: "transit", seed: 1 }),
    unlock: ROUND_UNLOCKS[1],
    capFrom: 50,
    capTo: 25,
  },
  2: {
    day: 2,
    theme: DEMO_RIDDLES[1],
    samplePhoto: proofSceneDataUri({ scene: "gym", seed: 2 }),
    unlock: ROUND_UNLOCKS[2],
    capFrom: 25,
    capTo: 12,
  },
  3: {
    day: 3,
    theme: DEMO_RIDDLES[2],
    samplePhoto: proofSceneDataUri({ scene: "grocery", seed: 3 }),
    unlock: ROUND_UNLOCKS[3],
    capFrom: 12,
    capTo: 6,
  },
  4: {
    day: 4,
    theme: DEMO_RIDDLES[3],
    samplePhoto: proofSceneDataUri({ scene: "beach", seed: 4 }),
    unlock: ROUND_UNLOCKS[4],
    capFrom: 6,
    capTo: 3,
  },
  5: {
    day: 5,
    theme: DEMO_RIDDLES[4],
    samplePhoto: proofSceneDataUri({ scene: "eating", seed: 5 }),
    unlock: ROUND_UNLOCKS[5],
    capFrom: 3,
    capTo: 1,
  },
};

export const INTRO_COPY = {
  eyebrow: "Feel the week before it starts",
  title: "LAST HUMAN STANDING",
  body: "Five compressed days. Riddle, proof, reveal, vote — until one human remains.",
  cta: "Step into day one →",
};

export const FINALE_COPY = {
  eyebrow: "The season, compressed",
  title: "YOU ARE THE LAST HUMAN STANDING",
  body: "In the real cohort this stretches across five real days with verified humans. The pot is on-chain. The riddles are different — these were practice.",
  shareCta: "SHARE THIS PRACTICE RUN",
  reserveCta: "Reserve your real slot →",
};

export const JURY_COPY = JURY_UNLOCK;

/** Recurring NPC cast — stable across demo days. */
export const NPCS = [
  { id: "marina", user: "@marina_sol", vibe: "reliable" },
  { id: "ghost", user: "@ghost_protocol", vibe: "sus" },
  { id: "luna", user: "@luna_waves", vibe: "hero" },
  { id: "spectre", user: "@spectre_x", vibe: "eliminated" },
  { id: "ember", user: "@ember_knit", vibe: "friend" },
];

const AUDIT_PHOTOS = {
  transit: [
    proofSceneDataUri({ scene: "transit", seed: 11 }),
    proofSceneDataUri({ scene: "transit", seed: 22 }),
    proofSceneDataUri({ scene: "transit", seed: 33 }),
  ],
  gym: [
    proofSceneDataUri({ scene: "gym", seed: 44 }),
    proofSceneDataUri({ scene: "gym", seed: 55 }),
  ],
  default: [
    proofSceneDataUri({ scene: "default", seed: 66 }),
  ],
};

/**
 * Day-1 audit cast. Player photo injected as id "you".
 */
export function buildDay1Audit({ playerPhoto, playerName = "you" } = {}) {
  const photos = AUDIT_PHOTOS.transit;
  const cast = [
    {
      id: "you",
      user: playerName.startsWith("@") ? playerName : `@${playerName}`,
      caption: "My answer, because… the in-between is where everyone is going somewhere else.",
      votes: { real: 8, fake: 2 },
      status: "pending",
      mediaUrl: playerPhoto || DEMO_DAYS[1].samplePhoto,
      isYou: true,
    },
    {
      id: "marina",
      user: "@marina_sol",
      caption: "My answer, because… Line 3, standing room only — nobody stays here.",
      votes: { real: 14, fake: 1 },
      status: "pending",
      mediaUrl: photos[0],
    },
    {
      id: "ghost",
      user: "@ghost_protocol",
      caption: "My answer, because… an Uber is basically transit…?",
      votes: { real: 3, fake: 11 },
      status: "pending",
      mediaUrl: photos[1],
    },
    {
      id: "luna",
      user: "@luna_waves",
      caption: "My answer, because… the ferry deck is the edge between two somewhere-elses.",
      votes: { real: 18, fake: 0 },
      status: "pending",
      mediaUrl: photos[2],
    },
  ];
  return cast;
}

/** Day-4 wildcard candidates (eliminated earlier in the fiction). */
export const WILDCARD_CANDIDATES = [
  {
    id: "spectre",
    user: "@spectre_x",
    blurb: "Out on demo day 2. Fierce auditor since. 4-day check-in streak before the fall.",
    tickets: 3,
  },
  {
    id: "ghost",
    user: "@ghost_protocol",
    blurb: "Flagged for the Uber bit. Has been voting like a bloodhound ever since.",
    tickets: 5,
  },
  {
    id: "ember",
    user: "@ember_knit",
    blurb: "Missed the window by 40 seconds. Everyone liked their photos.",
    tickets: 2,
  },
];

export function dayMeta(day) {
  return DEMO_DAYS[day];
}
