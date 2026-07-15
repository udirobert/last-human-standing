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
  {
    q: "Who sees my check-in photo?",
    a: "The day's audit feed — the cohort and spectators. It's shown with your display name or a truncated wallet, never as anonymous. GPS only appears if you choose to share it.",
  },
  {
    q: "Can others share my photo?",
    a: "Playing means your photo is part of a public audit — that's how the crowd decides HUMAN or SUS. We ask players not to redistribute photos off-platform or harass anyone. Report abuse on Discord.",
  },
];

/** Index of the “Who sees my check-in photo?” FAQ — used by What’s public chip. */
export const FAQ_PUBLIC_PHOTO_INDEX = FAQS.findIndex(
  (f) => f.q === "Who sees my check-in photo?",
);

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

/**
 * Personalization questions for onboarding.
 * Each answer feeds the paywall framing and the mascot's dialogue,
 * making the user feel the app was built for them.
 */
export const PROFILE_QUESTIONS = [
  {
    id: "strategy",
    question: "What's your play style?",
    options: [
      { value: "honest", label: "Honest", emoji: "🧍", blurb: "Real proofs. Let the photos speak." },
      { value: "cunning", label: "Cunning", emoji: "🕶️", blurb: "I'll bluff if I have to." },
      { value: "undecided", label: "Undecided", emoji: "🤔", blurb: "I'll figure it out as I go." },
    ],
  },
  {
    id: "theme",
    question: "Which daily theme would you ace?",
    options: [
      { value: "cafe", label: "Café", emoji: "☕" },
      { value: "park", label: "Park", emoji: "🌳" },
      { value: "gym", label: "Gym", emoji: "🏋️" },
      { value: "water", label: "Beach", emoji: "🌊" },
    ],
  },
  {
    id: "rhythm",
    question: "When do you check in?",
    options: [
      { value: "early", label: "Dawn raid", emoji: "🌅", blurb: "First to submit, every time." },
      { value: "steady", label: "Steady", emoji: "⏰", blurb: "Mid-day, no rush." },
      { value: "late", label: "Last minute", emoji: "🌙", blurb: "I thrive under pressure." },
    ],
  },
];

/**
 * Paywall personalization — the heading and framing change
 * based on the user's profile answers.
 */
export function getPersonalizedPaywall({ strategy, theme, rhythm } = {}) {
  const themeLabel = {
    cafe: "the café life",
    park: "touching grass",
    gym: "the gym grind",
    water: "the beach",
  }[theme] || "the daily theme";

  const strategyHook = {
    honest: "Your honest proofs could take you all the way.",
    cunning: "Your bluff game could fool them all — if you're careful.",
    undecided: "You'll find your style fast. The first theme drops Day 1.",
  }[strategy] || "50 humans. One pot. Last one standing.";

  const rhythmHook = {
    early: "Dawn raiders get the fastest slots. You'll love Day 1.",
    steady: "Consistency wins this game. You're built for it.",
    late: "Pressure players thrive when the cap shrinks. Day 3+ is yours.",
  }[rhythm] || "50 humans. One pot. Last one standing.";

  return {
    hook: strategyHook,
    sub: rhythmHook,
    themeLabel,
  };
}

/**
 * Social proof quotes for the paywall.
 */
export const PAYWALL_QUOTES = [
  { text: "Got flagged on Day 2 for a fake gym selfie. The crowd is brutal.", user: "@marina_sol", day: "Day 2 player" },
  { text: "Made it to Day 4 just by being honest and fast. The pot is real.", user: "@luna_waves", day: "Day 4 survivor" },
  { text: "The jury system is genius. My votes count double now.", user: "@ghost_protocol", day: "Eliminated, still playing" },
];

/** Utility-screen voice: the same fiction, without cinematic drama. */
export const CHAT_COPY = {
  demoResponses: [
    "still alive another day. respectable.",
    "anyone else watching the survivor count instead of sleeping",
    "if you haven't checked in yet, the clock is not your friend.",
    "that café proof needs a second look. we have standards.",
    "the pot grows. the cap shrinks. perfectly normal day.",
    "local spots make better proof. landmarks help.",
    "vote the photo, not the person.",
  ],
  sendFailed: "Message didn't make it through. Try once more.",
  worldChatFailed: "World Chat lost the signal. Your message stayed here.",
};

export const SURVIVAL_TIPS = [
  "Your check-in is your lifeline. Miss the window and you're out.",
  "Show the place and your face. The crowd needs both.",
  "GPS is optional. A visible landmark can earn the same trust.",
  "Fast gets you a provisional slot. Believable keeps it.",
  "Vote the proof, not the person.",
  "A flagged survivor gets replaced by the next convincing human.",
  "The cap shrinks every day. Tomorrow is less forgiving.",
  "Eliminated players become the jury. Their accuracy still matters.",
  "Infiltrators get immunity if the crowd believes the bluff.",
  "The Day 4 jury can bring one eliminated player back.",
  "A clear background beats a clever caption.",
  "Check in early. The audit can still change the cut.",
];

/**
 * SURVIVOR VOICE GUIDE
 *
 * The mascot is the warmest, most human thing in the app — but "warm" doesn't
 * mean "cute." It means real. Weathered. Someone who's been through the game.
 *
 * Voice: dry, darkly funny, quietly rooting for you.
 * A mentor who survived, not a cheerleader.
 *
 * Rules:
 *   1. Acknowledge, don't celebrate. "You survived" not "Great job!"
 *   2. Short sentences. Punchy. No exclamation marks unless it's genuine surprise.
 *   3. Dark humor is welcome — this is a game where 49 people get cut.
 *   4. Never saccharine. Never "you can do it!" — instead "don't get comfortable."
 *   5. The mascot knows the stakes. It's seen players go out. It doesn't soften that.
 *   6. One idea per line. No compound sentences.
 *
 * Good: "One day down. Four to go. Don't get comfortable."
 * Bad:  "Wow, you're doing amazing! Keep it up and you'll win the pot!"
 */
export const MASCOT_LINES = {
  // SpeedRun intro — first impression
  intro: "I'll be your guide. Stay human.",

  // Onboarding profile step
  profile: "Quick questions. This shapes your game.",

  // Audit — before voting
  auditStart: "Trust your gut. Human or bluff.",
  // Audit — voted HUMAN, crowd agrees
  auditHumanAgrees: "Crowd agrees. Nice read.",
  // Audit — voted HUMAN, crowd disagrees
  auditHumanDisagrees: "Bold call. Crowd thought otherwise.",
  // Audit — voted SUS, crowd agrees
  auditSusAgrees: "Caught the bluff. Good eye.",
  // Audit — voted SUS, crowd disagrees
  auditSusDisagrees: "Hmm. Crowd trusted them. We'll see.",
  // Audit — complete
  auditDone: (n) => `${n} votes cast. You've got the eye for this.`,

  // Survival moment
  survived: "One day down. Don't get comfortable.",
  // Elimination — near miss
  eliminatedNear: "So close. The jury can bring you back.",
  // Elimination — clear
  eliminated: "You're out. The crowd voted. Now you vote back.",
  // Finale
  finale: "Last human standing. The pot is yours. You earned this.",

  // Live-game mission card
  missionOpen: (cap, theme) => `Be one of the first ${cap}. ${theme}.`,
  missionPrelaunch: "Registered. The first theme drops when the cohort opens.",
  missionSpectator: "You're in the stands. Watch the audit and see how the game feels.",
  missionCheckedIn: "Submitted. The crowd judges every photo.",
  missionSurvived: "One day down. Don't get comfortable.",
  missionEliminated: "You're out. The audit needs you.",
  missionEnded: "One human took the pot. The next cohort is coming.",

  // Check-in coaching
  checkInPhoto: "Show the place. Show yourself. Real proof only.",
  checkInGps: "GPS helps the crowd trust you. Optional, but it helps.",
  checkInSubmit: "Ready when you are.",
  checkInSubmitting: "Sending. The jury will see it soon.",

  // Audit / vote progress
  voteProgressStart: (cast, goal) => `The audit needs you. ${cast} / ${goal} votes today.`,
  voteProgressDone: "Audit duty done. Keep voting for jury tickets.",
  voteProgressNeeds: (n) => `${n} photo${n !== 1 ? "s" : ""} below quorum. The audit needs you.`,

  // Rule reveal per day
  ruleUnlock1: (cap) => `Be fast. Be real. The first ${cap} check-ins provisionally survive.`,
  ruleUnlock2: "Infiltrators can bluff. Caught = out. Fooled = immunity.",
  ruleUnlock3: "The cap shrinks again. Speed matters more.",
  ruleUnlock4: "The jury can vote one eliminated player back in. Keep auditing.",
  ruleUnlock4Alive: "The eliminated are voting. One might walk back in.",
  ruleUnlock5: "One human. One pot. Last verified survivor wins.",

  // Wildcard
  wildcardOpen: "The jury picks one eliminated player to revive. Choose carefully.",
  wildcardVoted: "Vote cast. The revival triggers when Day 4 closes.",

  // Day recap
  dayRecapSurvived: "You survived. The cut shrinks tomorrow.",
  dayRecapEliminated: "You were cut. The jury can still bring you back.",
  dayRecapDefault: "Day closed. The remaining humans face tomorrow.",
};

/**
 * Mascot personality for the live mission card.
 */
export function getMissionMascot({ state, cap, theme } = {}) {
  switch (state) {
    case "prelaunch":
      return { variant: "thinking", message: MASCOT_LINES.missionPrelaunch };
    case "open":
      return { variant: "determined", message: MASCOT_LINES.missionOpen(cap, theme) };
    case "spectator":
      return { variant: "thinking", message: MASCOT_LINES.missionSpectator };
    case "checkedIn":
      return { variant: "thinking", message: MASCOT_LINES.missionCheckedIn };
    case "survived":
      return { variant: "proud", message: MASCOT_LINES.missionSurvived };
    case "eliminated":
      return { variant: "sad", message: MASCOT_LINES.missionEliminated };
    case "ended":
      return { variant: "winner", message: MASCOT_LINES.missionEnded };
    default:
      return { variant: "idle", message: null };
  }
}

/**
 * Mascot coaching for the check-in flow.
 */
export function getCheckInMascot({ step, photoPreview, gpsEnabled } = {}) {
  if (step === 1) {
    return { variant: "thinking", message: MASCOT_LINES.checkInSubmitting };
  }
  if (!photoPreview) {
    return { variant: "determined", message: MASCOT_LINES.checkInPhoto };
  }
  if (!gpsEnabled) {
    return { variant: "thinking", message: MASCOT_LINES.checkInGps };
  }
  return { variant: "proud", message: MASCOT_LINES.checkInSubmit };
}

/**
 * Mascot for the audit vote progress card.
 */
export function getVoteProgressMascot({ goalMet, needsVotes, cast, goal } = {}) {
  if (goalMet) {
    return { variant: "proud", message: MASCOT_LINES.voteProgressDone };
  }
  if (needsVotes > 0) {
    return { variant: "determined", message: MASCOT_LINES.voteProgressNeeds(needsVotes) };
  }
  return { variant: "thinking", message: MASCOT_LINES.voteProgressStart(cast, goal) };
}

/**
 * Mascot for the daily rule reveal.
 */
export function getRuleMascot({ day, eliminated } = {}) {
  switch (day) {
    case 1:
      return { variant: "thinking", message: MASCOT_LINES.ruleUnlock1(25) };
    case 2:
      return { variant: "excited", message: MASCOT_LINES.ruleUnlock2 };
    case 3:
      return { variant: "worried", message: MASCOT_LINES.ruleUnlock3 };
    case 4:
      return { variant: "shocked", message: eliminated ? MASCOT_LINES.ruleUnlock4 : MASCOT_LINES.ruleUnlock4Alive };
    case 5:
      return { variant: "winner", message: MASCOT_LINES.ruleUnlock5 };
    default:
      return { variant: "idle", message: null };
  }
}

/**
 * Mascot for the wildcard revival panel.
 */
export function getWildcardMascot({ voted } = {}) {
  return voted
    ? { variant: "proud", message: MASCOT_LINES.wildcardVoted }
    : { variant: "thinking", message: MASCOT_LINES.wildcardOpen };
}

/**
 * Mascot for the day recap cinematic.
 */
export function getDayRecapMascot({ personalResult } = {}) {
  if (personalResult === "survived") {
    return { variant: "proud", message: MASCOT_LINES.dayRecapSurvived };
  }
  if (personalResult === "eliminated") {
    return { variant: "sad", message: MASCOT_LINES.dayRecapEliminated };
  }
  return { variant: "thinking", message: MASCOT_LINES.dayRecapDefault };
}

/**
 * Mascot for the final endgame ceremony.
 */
export function getEndgameMascot({ youWon, eliminated } = {}) {
  if (youWon) {
    return { variant: "winner", message: MASCOT_LINES.finale };
  }
  if (eliminated) {
    return { variant: "sad", message: MASCOT_LINES.missionEliminated };
  }
  return { variant: "thinking", message: MASCOT_LINES.missionEnded };
}

/**
 * Profile-aware mascot lines.
 *
 * Reads the user's onboarding profile (strategy, theme, rhythm) from
 * localStorage and generates personalized dialogue for key game moments.
 * Falls back to the generic MASCOT_LINES if no profile exists.
 *
 * This is what makes the personalization feel real — not just paywall text,
 * but the mascot actually knowing who you are during the game.
 */
export function getProfiledMascotLines() {
  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem("lhs_profile") || "{}");
  } catch { /* ignore */ }

  const { strategy, rhythm } = profile;

  // Personalized intro — references their strategy
  const intro = strategy === "cunning"
    ? "I'll be your guide. You said you'd bluff. Careful with that."
    : strategy === "honest"
      ? "I'll be your guide. You said you'd play it straight. Good."
      : MASCOT_LINES.intro;

  // Personalized audit start — references their rhythm
  const auditStart = rhythm === "early"
    ? "First to vote. Trust your gut."
    : rhythm === "late"
      ? "Last minute, as usual. Trust your gut."
      : MASCOT_LINES.auditStart;

  // Personalized survived — references their strategy
  const survived = strategy === "cunning"
    ? "One day down. They haven't caught you yet."
    : strategy === "honest"
      ? "One day down. Honest proof, honest result."
      : MASCOT_LINES.survived;

  // Personalized eliminated — references their strategy
  const eliminated = strategy === "cunning"
    ? "You're out. The bluff didn't hold. Now you vote back."
    : strategy === "honest"
      ? "You're out. Honest doesn't always mean safe. Now you vote back."
      : MASCOT_LINES.eliminated;

  // Personalized finale — references their rhythm
  const finale = rhythm === "early"
    ? "Last human standing. Dawn raider to the end. You earned this."
    : rhythm === "late"
      ? "Last human standing. Under pressure, you delivered. You earned this."
      : MASCOT_LINES.finale;

  return {
    ...MASCOT_LINES,
    intro,
    auditStart,
    survived,
    eliminated,
    finale,
    hasProfile: Object.keys(profile).length > 0,
  };
}
