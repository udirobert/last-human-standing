import { COHORT_SCHEDULE, findTheme } from "../data/game.js";

/**
 * Next-day postcard payload from the closed day + cohort schedule.
 * Opens at 18:00Z on the schedule date (matches DayZeroBanner / launch convention).
 */
export function resolveTomorrow(closedDay, { remaining = null } = {}) {
  const closed = Number(closedDay);
  if (!Number.isFinite(closed) || closed < 1) return null;

  const nextDay = closed + 1;
  if (nextDay < 2 || nextDay > 5) return null;

  const slot = COHORT_SCHEDULE.find((d) => d.day === nextDay);
  if (!slot?.date) return null;

  const meta = findTheme(slot.theme) || slot;
  const opensAt = new Date(`${slot.date}T18:00:00Z`).toISOString();

  return {
    closedDay: closed,
    day: nextDay,
    theme: String(slot.theme).toUpperCase(),
    emoji: slot.emoji || meta.emoji || "☕",
    cap: slot.cap ?? null,
    dayLabel: slot.dayLabel || null,
    date: slot.date,
    opensAt,
    remaining: remaining != null ? Number(remaining) : null,
  };
}

export function tomorrowPostcardKey(closedDay) {
  if (closedDay == null) return null;
  return `lhs_tomorrow_postcard_${closedDay}`;
}
