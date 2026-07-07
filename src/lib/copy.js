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
    body: "Pay 1 WLD (World Chain) or 5 cUSD (Celo) to lock your slot — or enter free. 50 humans max.",
    icon: "🎟",
  },
  {
    n: "02",
    title: "DAILY THEME",
    body: "Find the place. Be first to check in.",
    icon: "🌍",
  },
  {
    n: "03",
    title: "PROVE IT",
    body: "Photo + crowd votes HUMAN or SUS.",
    icon: "📸",
  },
  {
    n: "04",
    title: "SURVIVE",
    body: "Cap shrinks daily. Last one takes the pot.",
    icon: "🏆",
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
    a: "You're out. But you join the jury — your votes count double.",
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
