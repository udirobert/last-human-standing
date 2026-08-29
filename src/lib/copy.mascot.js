/**
 * Survivor mascot dialogue — split out of copy.js (which was mixing static
 * copy constants, formatting functions, and this ~200-line mascot subsystem
 * in one file). Re-exported from copy.js so every existing import site
 * (`import { getRuleMascot } from "../lib/copy.js"`, etc.) keeps working
 * unchanged.
 *
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
import { survivalRuleShort, holdRoomPressure } from "./copy.js";

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
  ruleUnlock1: () => "Today's riddle is live. Check in within the window — the crowd votes on every photo.",
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

  // Riddle reaction — mascot mutters when the riddle is first read.
  // Keyed by day, so each riddle gets a tailored reaction.
  riddleReaction: {
    1: "The gathering. Everyone has a place they belong. Make yours unreadable.",
    2: "The wild. Find green the city forgot. Not hard to find — hard to make yours.",
    3: "The bond. Proof of love. Don't overthink it — but don't fake it either.",
    4: "The quiet. A place that asks for silence. The silence is the proof.",
    5: "The dawn. First to see the day. The sky doesn't lie — but you still have to be there.",
  },
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
