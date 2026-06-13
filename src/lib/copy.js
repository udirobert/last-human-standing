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
  // World Chain: 1 WLD = $1 at the time of writing. Celo: 5 cUSD or
  // 5 USDC. All routes go into the single prize pot.
  paid: {
    title: "RESERVE A SLOT",
    blurb: "Pay 1 WLD (World Chain) or 5 cUSD / 5 USDC (Celo). Guaranteed entry. Fees go to the prize pot.",
    perChain: [
      { chain: "World Chain", token: "WLD", amount: "1" },
      { chain: "Celo", token: "cUSD", amount: "5" },
      { chain: "Celo", token: "USDC", amount: "5" },
    ],
  },
  free: {
    title: "ENTER FREE LOTTERY",
    blurb: "No payment. 25 lottery spots drawn at launch from everyone who registered. Top referrers get a higher pick position.",
  },
  fallback: {
    title: "RESERVE",
    blurb: "Cohort cap is 50 humans, worldwide.",
  },
};

export const RULES = [
  {
    n: "01",
    title: "RESERVE OR ENTER FREE",
    body: "Pay 1 WLD / 5 cUSD / 5 USDC to guarantee a slot, or enter the free lottery. 25 paid + 25 lottery.",
    icon: "🎟",
  },
  {
    n: "02",
    title: "DAILY THEME",
    body: "Find the place type anywhere on Earth. Race to be one of the first 25 to check in.",
    icon: "🌍",
  },
  {
    n: "03",
    title: "PROVE IT",
    body: "Photo + crowd vote HUMAN or SUS. Optional GPS for credibility.",
    icon: "📸",
  },
  {
    n: "04",
    title: "LAST ONE WINS",
    body: "Cap shrinks daily until one human takes the on-chain pot. All paid fees go in.",
    icon: "🏆",
  },
];

export const FAQS = [
  {
    q: "Do I need crypto to play?",
    a: "No — you can enter the free lottery. But paying 1 WLD or 5 cUSD / 5 USDC guarantees your slot and grows the prize pot.",
  },
  {
    q: "What does my fee pay for?",
    a: "100% of paid entry fees go into the on-chain prize pot. The pot is split if a human wins, or rolled to the next cohort if not.",
  },
  {
    q: "What if I miss a day?",
    a: "You're eliminated — but you can still vote in the audit, hang out in the lobby, and watch the cohort play out.",
  },
  {
    q: "What if the lottery doesn't fill?",
    a: "Every free entrant who registered before launch is in. If fewer than 25 registered, all of them are in and the remaining spots stay open for paid entries.",
  },
  {
    q: "Can I play from any country?",
    a: "Yes. Themes are place types (a café, a park), not GPS pins. Find the place anywhere on Earth and take a photo.",
  },
];

/**
 * Returns the copy that explains how to enter, for a given audience:
 *   - "first-time": hasn't paid yet (Onboarding step 2)
 *   - "lottery": already in the free lottery
 *   - "paid": already paid
 */
export function getEntryCopy({ isFreeMode = isFreeEntryMode(), alreadyPaid = false } = {}) {
  if (alreadyPaid) {
    return {
      title: "SPOT SECURED",
      blurb: "You're in. Come back when Day 1 opens.",
    };
  }
  if (isFreeMode) {
    return {
      title: ENTRY.paid.title,
      blurb: ENTRY.paid.blurb,
    };
  }
  return ENTRY.fallback;
}
