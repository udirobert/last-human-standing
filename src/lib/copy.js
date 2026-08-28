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

/**
 * THE canonical survival sentence (design review, finding 3).
 *
 * Survival is a hybrid: everyone who checks in within the window is eligible,
 * and if eligible players exceed the cap a deterministic cohort-seed lottery
 * decides who survives. A SUS verdict disqualifies you — promoting the next
 * player. One literal sentence everywhere so the model can never read
 * differently depending on which screen you land on. Use `survivalRule(cap)`
 * where there is room for the full sentence; `survivalRuleShort(cap)` for
 * one-line spots.
 */
export function survivalRule(cap) {
  return `Check in within the window. If more than ${cap} are eligible, a seed lottery decides who survives. A SUS verdict disqualifies you and promotes the next player.`;
}

export function survivalRuleShort(cap) {
  return `Check in within the window. If more than ${cap} are eligible, the seed lottery decides.`;
}

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
    title: "FREE SEAT",
    blurb: "First come, first seated. No payment.",
    cta: "CLAIM MY SEAT →",
  },
  fallback: {
    cardLabel: "Reserve",
    title: "RESERVE A SLOT",
    blurb: "One entry, one slot.",
  },
};

export const ENTRY_HEADING = {
  // Pilot posture: free, verified-human, first come first seated.
  freeMode: "CLAIM YOUR SEAT",
  freeModeSub: "Free pilot for verified humans. First come, first seated.",
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
    title: "CLAIM YOUR SEAT",
    body: "Free, verified-human entry. First come, first seated — the roster closes before Day 1.",
    icon: "🎟",
  },
  {
    n: "02",
    title: "DAILY RIDDLE",
    body: "Every day a new riddle drops — interpret it, find your answer, snap it. Interpretation is the skill.",
    icon: "🧩",
  },
  {
    n: "03",
    title: "PROVE IT",
    body: "Snap a photo with a one-line argument. The criteria are revealed before voting. The crowd votes HUMAN or SUS. A SUS verdict disqualifies you — the next player takes your slot.",
    icon: "📸",
  },
  {
    n: "04",
    title: "SURVIVE",
    body: "Each day the cap shrinks. If more players are eligible than the cap, a seed lottery decides. Outlast them all and the pot is yours.",
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
    id: "day1_riddle",
    eyebrow: "Day 1 · The asking",
    title: "READ IT. ANSWER IT.",
    body: survivalRule(25),
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
    body: "The survival cap just shrank again. If more players are eligible than the cap, the seed lottery decides. Miss today and you join the jury.",
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
  body: "Your votes decide who survives. Hit 80% accuracy on 5+ votes and your votes count ×2. Accuracy is your influence now.",
  cta: "OPEN THE AUDIT →",
};

/**
 * One-line mission mantra for the live home / MissionBoard.
 * Keeps the first viewport to a single job — not a rulebook.
 */
/**
 * Mid-day wait pressure for checked-in players (hold-the-room pass).
 * minutesLeft null → calm default.
 */
export function holdRoomPressure(minutesLeft) {
  if (minutesLeft == null) return "calm";
  if (minutesLeft < 60) return "closing";
  if (minutesLeft < 360) return "thinning";
  return "calm";
}

/** Warm human body under the cold checked-in status chrome. */
export function holdRoomCopy({
  minutesLeft = null,
  survived = false,
  cap = 25,
} = {}) {
  const pressure = holdRoomPressure(minutesLeft);
  if (survived) {
    if (pressure === "closing") {
      return {
        shelf: "Final hour",
        body: "Verdicts are landing. Stay in the audit — a flagged survivor frees a seat.",
      };
    }
    if (pressure === "thinning") {
      return {
        shelf: "Hold the room",
        body: "You made the provisional cut. The field is still being judged.",
      };
    }
    return {
      shelf: "Hold the room",
      body: "You're in. Keep an eye on the audit while the window stays open.",
    };
  }
  if (pressure === "closing") {
    return {
      shelf: "Final hour",
      body: "At risk until close. Flagged survivors get replaced — your rank can still move.",
    };
  }
  if (pressure === "thinning") {
    return {
      shelf: "Field is thinning",
      body: `Cap is ${cap}. Audit the proofs — every SUS vote tightens the room.`,
    };
  }
  return {
    shelf: "Hold the room",
    body: "Checked in. The crowd judges every photo. Spend the wait in the audit.",
  };
}

/**
 * Shared post-seal dialect for MissionBoard, Feed empty, Chat, spectator/jury.
 * role: "checkedIn" | "spectator" | "jury"
 */
/**
 * DayRecap CTA label after dismiss — teases tomorrow without a second overlay.
 */
export function dayRecapContinueLabel({
  personalResult = null,
  currentDay = null,
  nextTheme = null,
} = {}) {
  if (personalResult === "eliminated") return "Continue to the audit →";
  const day = Number(currentDay);
  if (Number.isFinite(day) && day < 5) {
    const themeBit = nextTheme ? ` · ${nextTheme}` : "";
    return `Continue to Day ${day + 1}${themeBit} →`;
  }
  if (Number.isFinite(day)) return "Continue to the finale →";
  return "Continue to today's mission →";
}

export function postSealCopy({
  minutesLeft = null,
  role = "checkedIn",
  survived = false,
  cap = 25,
} = {}) {
  if (role === "spectator") {
    return {
      shelf: "Watch the field",
      body: "You're watching this cohort. Audit the proofs — accurate votes build your jury record.",
    };
  }
  if (role === "jury") {
    return {
      shelf: "Watch the field",
      body: "You're out of the race — still in the room. Vote the living; the field still needs you.",
    };
  }
  const pressure = holdRoomPressure(minutesLeft);
  if (pressure === "calm" && !survived) {
    return {
      shelf: "Proof received",
      body: "Sealed for the jury. Your photo is on trial — spend the wait in the audit.",
    };
  }
  return holdRoomCopy({ minutesLeft, survived, cap });
}

export function missionMantra({
  cap = 25,
  checkedIn = false,
  eliminated = false,
  survived = false,
  minutesLeft = null,
} = {}) {
  if (eliminated) {
    return { kicker: "Your job now", line: "Audit the living. Your votes decide who stays." };
  }
  if (checkedIn && survived) {
    const warm = holdRoomCopy({ minutesLeft, survived: true, cap });
    return { kicker: warm.shelf, line: warm.body };
  }
  if (checkedIn) {
    const warm = holdRoomCopy({ minutesLeft, survived: false, cap });
    return { kicker: warm.shelf, line: warm.body };
  }
  // The riddle name is already displayed above the mantra on the mission
  // card, so keep the line generic — the job is "answer the riddle".
  return {
    kicker: "Your only job today",
    line: "Answer the riddle. Your photo is your answer — add one line on why it fits.",
    footnote: survivalRuleShort(cap),
  };
}

/**
 * The daily loop, for the landing's "How It Works" narrative (DayTimeline).
 * Kept in sync with the real close_day() mechanic (supabase/migrations/
 * 040_lottery_close_day.sql + 042_reveal_vote_window.sql): everyone who
 * checks in within the window is eligible; if eligible players exceed the
 * cap a deterministic cohort-seed lottery decides survival; a flagged
 * submission is disqualified and backfilled by the next eligible check-in.
 * Not a speed race and not pure judgment. Also: don't promise a specific
 * reveal mechanism (time of day, "random") that the system doesn't actually
 * guarantee — promise what's true regardless of mechanism: you don't know
 * the criteria in advance.
 */
export const DAILY_LOOP = [
  {
    num: "01",
    title: "A riddle drops",
    body: "An interpretive prompt is announced — you won't know which until it does. Read it, find your answer anywhere on Earth, your way.",
  },
  {
    num: "02",
    title: "Snap your answer",
    body: "A selfie with a one-line argument, optionally GPS-stamped, inside the 18-hour window. That's your proof you're still here.",
  },
  {
    num: "03",
    title: "Reveal and trust",
    body: "The judging criteria are revealed before voting. A SUS verdict disqualifies you and promotes the next player — so a photo only counts if it reads as real.",
  },
  {
    num: "04",
    title: "Last human standing",
    body: "50 → 25 → 12 → 6 → 3 → 1. If more players are eligible than the cap, a seed lottery decides. Outlast the crowd for five days and the whole pot is yours.",
  },
];

export const FAQS = [
  {
    q: "What does it cost to play?",
    a: "Nothing. This cohort is a free, closed pilot for verified humans. First come, first seated until the roster closes.",
  },
  {
    q: "What's the prize?",
    a: "A sponsor prize: 5 WLD on World Chain plus 35 cUSD on Celo. Funds stay operator-custodied during the pilot and the winner receives both after the 48-hour appeal window. Both transaction hashes are published in the recap.",
  },
  {
    q: "How do I survive a day?",
    a: "Check in within the window. Everyone who submits is eligible; if eligible players exceed the cap, a deterministic seed lottery decides who survives. A SUS verdict disqualifies you and promotes the next player. The cap shrinks every day: 25 → 12 → 6 → 3 → 1.",
  },
  {
    q: "What if I miss a day?",
    a: "You're out of the race — but you become a juror. Your votes decide who survives, and they count double once you hit 80% accuracy on 5+ votes.",
  },
  {
    q: "Can I come back after being eliminated?",
    a: "Not into this cohort — but you stay in the room as a juror. Vote accurately and build your detective rank for the pilot record.",
  },
  {
    q: "Any country?",
    a: "Yes. Riddles are interpretive prompts, not GPS pins. Find your answer anywhere.",
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
    question: "Which kind of riddle would you ace?",
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
      { value: "early", label: "First light", emoji: "🌅", blurb: "In as soon as the riddle drops." },
      { value: "steady", label: "Steady", emoji: "⏰", blurb: "Mid-window, no rush." },
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
  }[theme] || "the daily riddle";

  const strategyHook = {
    honest: "Your honest proofs could take you all the way.",
    cunning: "You'll play it close. Careful reads win rooms.",
    undecided: "You'll find your style fast. The first riddle drops Day 1.",
  }[strategy] || "50 humans. One pot. Last one standing.";

  const rhythmHook = {
    early: "In at first light. You'll love Day 1.",
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
 * Social proof quotes for the claim screen.
 *
 * Intentionally empty in the pilot: hard-coded Day 2 / Day 4 testimonials
 * read as fabricated when no cohort has played yet (design review finding 4).
 * Populate from real, clearly-labelled pilot quotes only after Day 1.
 */
export const PAYWALL_QUOTES = [];

/** Utility-screen voice: the same fiction, without cinematic drama. */
export const CHAT_COPY = {
  demoResponses: [
    "still alive another day. respectable.",
    "anyone else watching the survivor count instead of sleeping",
    "if you haven't checked in yet, the window won't stay open forever.",
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
  "Everyone in the window is eligible. Believable keeps you alive after the draw.",
  "Vote the proof, not the person.",
  "A flagged survivor gets replaced by the next convincing human.",
  "The cap shrinks every day. Tomorrow is less forgiving.",
  "Eliminated players become the jury. Their votes still count double.",
  "A clear background beats a clever caption.",
  "The criteria are revealed before voting. Read them, then judge.",
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
  eliminatedNear: "So close. The jury still needs you.",
  // Elimination — clear
  eliminated: "You're out. The crowd voted. Now you vote back.",
  // Finale
  finale: "Last human standing. The pot is yours. You earned this.",

  // Live-game mission card
  missionOpen: (cap, theme) => `${survivalRuleShort(cap)} ${theme}.`,
  missionPrelaunch: "Registered. The first riddle drops when the cohort opens.",
  missionSpectator: "You're in the stands. Watch the audit and see how the game feels.",
  missionCheckedIn: "Submitted. Hold the room — audit while you wait.",
  missionCheckedInThinning: "The field is thinning. Stay sharp in the audit.",
  missionCheckedInClosing: "Final hour. Verdicts land soon — keep voting.",
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
  voteProgressDone: "Audit duty done. Accuracy is your influence.",
  voteProgressNeeds: (n) => `${n} photo${n !== 1 ? "s" : ""} below quorum. The audit needs you.`,

  // Rule reveal per day
  ruleUnlock1: (cap) => survivalRule(cap),
  ruleUnlock2: "Infiltrators can bluff. Caught = out. Fooled = immunity.",
  ruleUnlock3: "The cap shrinks again. If the field overflows, the seed lottery decides.",
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
export function getMissionMascot({ state, cap, theme, minutesLeft } = {}) {
  switch (state) {
    case "prelaunch":
      return { variant: "thinking", message: MASCOT_LINES.missionPrelaunch };
    case "open":
      return { variant: "determined", message: MASCOT_LINES.missionOpen(cap, theme) };
    case "spectator":
      return { variant: "thinking", message: MASCOT_LINES.missionSpectator };
    case "checkedIn": {
      const pressure = holdRoomPressure(minutesLeft);
      if (pressure === "closing") {
        return { variant: "worried", message: MASCOT_LINES.missionCheckedInClosing };
      }
      if (pressure === "thinning") {
        return { variant: "thinking", message: MASCOT_LINES.missionCheckedInThinning };
      }
      return { variant: "thinking", message: MASCOT_LINES.missionCheckedIn };
    }
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
    ? "You're out. Played it close, didn't hold. Now you vote back."
    : strategy === "honest"
      ? "You're out. Honest doesn't always mean safe. Now you vote back."
      : MASCOT_LINES.eliminated;

  // Personalized finale — references their rhythm
  const finale = rhythm === "early"
    ? "Last human standing. First light to the end. You earned this."
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
