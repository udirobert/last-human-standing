/**
 * Single source of truth for "how to play" copy.
 *
 * Why this exists: the prelaunch messaging was scattered across
 * Onboarding (5+ inline strings), GameHome, BrowserWalletPay, and
 * the FAQ. Investors and mentors reviewing the launch saw
 * inconsistent wording depending on which screen they landed on.
 * This file is the only place copy that explains the model lives.
 *
 * If you change the model, change the copy here and the whole app
 * follows.
 */
import { isFreeEntryMode } from "./env.js";

export const COHORT = {
  size: 50,
  paidSlots: 25,
  freeSlots: 25,
};

export const ENTRY = {
  paid: {
    cardLabel: "Guaranteed",
    title: "PAY 1 WLD",
    blurb: "Guaranteed slot. Goes straight to the pot.",
    perChain: [
      { chain: "World Chain", token: "WLD", amount: "1" },
      { chain: "Celo", token: "cUSD", amount: "5" },
    ],
  },
  free: {
    cardLabel: "Free",
    title: "FREE LOTTERY",
    blurb: "Drawn at launch. No payment.",
    cta: "JOIN FREE →",
  },
  fallback: {
    cardLabel: "Reserve",
    title: "RESERVE A SLOT",
    blurb: "Pay the entry fee. One entry, one slot.",
  },
};

export const ENTRY_HEADING = {
  freeMode: "CHOOSE YOUR PATH",
  freeModeSub: "Pay to guarantee, or try the free lottery.",
  paidMode: "RESERVE A SLOT",
  paidModeSub: "50 humans. One pot. Last one standing.",
  alreadyPaid: "YOU'RE IN",
  alreadyPaidSub: "Day 1 opens soon.",
};

export const RULES = [
  {
    n: "01",
    title: "RESERVE",
    body: "Pay 1 WLD (World Chain) or 5 cUSD (Celo) to lock your slot — or enter free. 50 humans max. Your fee goes straight to the pot.",
    icon: "🎟",
  },
  {
    n: "02",
    title: "DAILY THEME",
    body: "Every day a new challenge drops — find the place, snap the proof. Be fast. Be real. Be first.",
    icon: "🌍",
  },
  {
    n: "03",
    title: "PROVE IT",
    body: "The crowd votes HUMAN or SUS on your photo. Infiltrators try to fake it — can you spot them? Can they spot you?",
    icon: "📸",
  },
  {
    n: "04",
    title: "SURVIVE",
    body: "Each day the cap shrinks. The crowd eliminates the weakest. Outlast them all and the pot is yours.",
    icon: "🏆",
  },
  {
    n: "05",
    title: "WILDCARD",
    body: "Eliminated? On Day 4 the jury votes to revive one player. Keep voting — your detective rank makes you visible for revival.",
    icon: "🎭",
  },
];

/**
 * The daily loop, for the landing's "How It Works" narrative (DayTimeline).
 * Kept in sync with the real close_day() mechanic (supabase/migrations/
 * 008_lethal_votes.sql): survival is a HYBRID of rank (the fastest N
 * check-ins provisionally survive) and crowd vote (a flagged submission is
 * disqualified and backfilled by the next-fastest check-in) — not pure
 * speed and not pure judgment. Also: don't promise a specific reveal
 * mechanism (time of day, "random") that the system doesn't actually
 * guarantee — promise what's true regardless of mechanism: you don't know
 * in advance.
 */
export const DAILY_LOOP = [
  {
    num: "01",
    title: "A theme drops",
    body: "A real-world place is announced — you won't know which until it does. Find it anywhere on Earth, your way.",
  },
  {
    num: "02",
    title: "Snap yourself there",
    body: "A selfie, optionally GPS-stamped, inside the check-in window. That's your proof you're still here.",
  },
  {
    num: "03",
    title: "Speed and trust",
    body: "The fastest check-ins provisionally survive — but the crowd still judges every photo. Get flagged as fake, and a slower, more convincing survivor takes your slot.",
  },
  {
    num: "04",
    title: "Last human standing",
    body: "50 → 25 → 12 → 6 → 3 → 1. Outlast the crowd for five days and the whole pot is yours.",
  },
];

export const FAQS = [
  {
    q: "Do I need crypto?",
    a: "No — enter the free lottery. Paying 1 WLD guarantees your slot and grows the pot.",
  },
  {
    q: "Where does my fee go?",
    a: "100% into the on-chain prize pot. The last human takes it all.",
  },
  {
    q: "What if I miss a day?",
    a: "You're out. But you join the jury — your votes count double. And on Day 4, the jury can revive one eliminated player back into the game.",
  },
  {
    q: "Can I come back after being eliminated?",
    a: "Yes! The Day 4 wildcard revival lets the jury vote one player back in. Keep voting accurately to stay visible — the jury favors players with high detective rank and long streaks.",
  },
  {
    q: "Any country?",
    a: "Yes. Themes are place types (café, park), not GPS pins. Find one anywhere.",
  },
];

/**
 * Returns the copy that explains how to enter, for a given audience:
 *   - "first-time": hasn't paid yet (Onboarding step 2)
 *   - "lottery": already in the free lottery
 *   - "paid": already paid
 */
export function getEntryHeading({ isFreeMode = isFreeEntryMode(), alreadyPaid = false } = {}) {
  if (alreadyPaid) {
    return { title: ENTRY_HEADING.alreadyPaid, sub: ENTRY_HEADING.alreadyPaidSub };
  }
  if (isFreeMode) {
    return { title: ENTRY_HEADING.freeMode, sub: ENTRY_HEADING.freeModeSub };
  }
  return { title: ENTRY_HEADING.paidMode, sub: ENTRY_HEADING.paidModeSub };
}
