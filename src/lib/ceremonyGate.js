/**
 * Day-open ceremony coordination.
 *
 * Live days previously stacked ThemeReveal + RuleReveal + DayBriefing
 * (and tips) on top of each other. RuleReveal owns the day-unlock
 * ceremony when ROUND_UNLOCKS has an entry; everything else yields.
 */

const UNLOCKS_SEEN_KEY = "lhs_round_unlocks_seen";

export function readUnlocksSeen() {
  try {
    const raw = localStorage.getItem(UNLOCKS_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function markUnlockSeen(id) {
  try {
    const next = readUnlocksSeen();
    next.add(id);
    localStorage.setItem(UNLOCKS_SEEN_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore quota / private mode */
  }
}

/** True when RuleReveal still owes the player a day-unlock overlay. */
export function hasPendingRuleUnlock(day, unlocks) {
  const entry = unlocks?.[day];
  if (!entry?.id) return false;
  return !readUnlocksSeen().has(entry.id);
}

export function briefingStorageKey(day) {
  return `lhs_day_briefing_${day}`;
}

export function markBriefingSeen(day) {
  if (day == null) return;
  try {
    localStorage.setItem(briefingStorageKey(day), "1");
  } catch {
    /* ignore */
  }
}

/** Spec-reveal ("the turn") ceremony — one per day, at reveal_at. */
export function specRevealStorageKey(day) {
  return `lhs_spec_reveal_seen_${day}`;
}

export function readSpecRevealSeen(day) {
  if (day == null) return false;
  try {
    return localStorage.getItem(specRevealStorageKey(day)) === "1";
  } catch {
    return false;
  }
}

export function markSpecRevealSeen(day) {
  if (day == null) return;
  try {
    localStorage.setItem(specRevealStorageKey(day), "1");
  } catch {
    /* ignore */
  }
}
