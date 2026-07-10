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

/**
 * Onboarding rules — the CORE LOOP only.
 * Advanced mechanics (infiltrator, jury, wildcard) are taught later via
 * ROUND_UNLOCKS when they actually matter. Don't spoil the myth here.
 */
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
    body: "Snap a photo. The crowd votes HUMAN or SUS. Fake it and you're out — a slower, more convincing human takes your slot.",
    icon: "📸",
  },
  {
    n: "04",
    title: "SURVIVE",
    body: "Each day the cap shrinks. Outlast them all and the pot is yours.",
    icon: "🏆",
  },
];

/**
 * Progressive disclosure — one twist per day, revealed when the round opens.
 * Keyed to real mechanic unlocks (not arbitrary "new rules").
 * Shown once via RuleReveal; dismissed state lives in localStorage.
 */
export const ROUND_UNLOCKS = {
  1: {
    id: "day1_race",
    eyebrow: "Day 1 · The race",
    title: "BE FAST. BE REAL.",
    body: "The fastest check-ins provisionally survive — but the crowd still judges every photo. Get flagged, and someone slower takes your slot.",
    cta: "I'M IN →",
  },
  2: {
    id: "day2_infiltrator",
    eyebrow: "Day 2 · New path",
    title: "INFILTRATORS UNLOCKED",
    body: "When you check in, you can opt to bluff. Fool the crowd → immunity through tomorrow's cut. Get caught → you're out, and any immunity burns.",
    cta: "UNDERSTOOD →",
  },
  3: {
    id: "day3_pressure",
    eyebrow: "Day 3 · The cut deepens",
    title: "FEWER SPOTS. SAME STAKES.",
    body: "The survival cap just shrank again. Speed matters more. Looking human matters more. Miss today and you join the jury.",
    cta: "LET'S GO →",
  },
  4: {
    id: "day4_wildcard",
    eyebrow: "Day 4 · Wildcard",
    title: "THE JURY CAN REVIVE ONE",
    body: "When today closes, eliminated players vote one human back into the game. Keep auditing — accuracy keeps you visible for revival.",
    bodyAlive: "The eliminated are voting. One of them might walk back in when today closes. Stay sharp — the audit still decides who holds a slot.",
    cta: "I'M READY →",
  },
  5: {
    id: "day5_finale",
    eyebrow: "Day 5 · Finale",
    title: "ONE HUMAN. ONE POT.",
    body: "Cap is 1. Check in. Survive the audit. The last verified human takes everything.",
    cta: "ENTER THE FINALE →",
  },
};

/** Jury identity — shown once on first elimination (GameMoment also teaches this). */
export const JURY_UNLOCK = {
  id: "jury_identity",
  eyebrow: "You're out — but not done",
  title: "YOU'RE THE JURY NOW",
  body: "Your votes decide who survives. Hit 80% accuracy on 5+ votes and yours count ×2 — plus lottery tickets for the next cohort.",
  cta: "OPEN THE AUDIT →",
};

/**
 * One-line mission mantra for the live home / MissionBoard.
 * Keeps the first viewport to a single job — not a rulebook.
 */
export function missionMantra({
  theme,
  cap = 25,
  checkedIn = false,
  eliminated = false,
  survived = false,
} = {}) {
  if (eliminated) {
    return { kicker: "Your job now", line: "Audit the living. Your votes decide who stays." };
  }
  if (checkedIn && survived) {
    return { kicker: "Hold the line", line: "You made the provisional cut. The crowd still judges." };
  }
  if (checkedIn) {
    return {
      kicker: "Checked in",
      line: `Rank locked for now — flagged survivors get replaced. Cap is ${cap}.`,
    };
  }
  const place = theme ? String(theme) : "TODAY'S THEME";
  return {
    kicker: "Your only job today",
    line: `Be one of the first ${cap}. ${place}.`,
  };
}

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
