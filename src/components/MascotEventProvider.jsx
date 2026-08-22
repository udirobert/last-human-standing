import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { MascotEventContext } from "../__experimental__/MascotEventContext.js";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";
import { MASCOT_LINES, getProfiledMascotLines } from "../lib/copy.js";

/**
 * MascotEventProvider — a small, central state model for the mascot's
 * reactions across the app.
 *
 * Instead of each screen independently computing a variant, this
 * provider derives a DURABLE baseline from the round lifecycle:
 *
 *   idle → check_in_due → (closing soon → worried)
 *                        → submitting → awaiting_audit
 *                          ↓
 *                    survived / eliminated
 *                          ↓
 *                    streak / achievement (transient)
 *
 * Screens can dispatch TRANSIENT events (vote reactions, achievements,
 * streak milestones) that override the baseline for a few seconds,
 * then the mascot settles back to the durable state.
 *
 * This avoids contradictory states between GameHome, Feed, and overlays,
 * and lets the mascot react ONCE when a rank or verdict changes rather
 * than merely recomputing on every render.
 */

/** Event types that auto-expire (time-boxed). */
const TRANSIENT_TYPES = new Set([
  "vote_react",
  "achievement",
  "streak",
  "rank_change",
]);
const TRANSIENT_MS = 4000;

/** Deadline proximity — become worried within this window. */
const WORRY_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Derive the durable mascot event from round data.
 * Returns { type, variant, message, timestamp, durable: true }.
 */
function deriveDurable(round, world, lines) {
  const { you, isLive, isPrelaunch, isEnded, round: roundData } = round;
  const user = world?.user;

  if (isEnded) {
    if (you?.isEliminated) {
      return { type: "eliminated", variant: "sad", message: lines.missionEliminated, timestamp: 0, durable: true };
    }
    return { type: "ended", variant: "winner", message: lines.missionEnded, timestamp: 0, durable: true };
  }

  if (isPrelaunch) {
    return { type: "idle", variant: "thinking", message: lines.missionPrelaunch, timestamp: 0, durable: true };
  }

  if (isLive) {
    if (you?.isEliminated) {
      return { type: "eliminated", variant: "sad", message: lines.missionEliminated, timestamp: 0, durable: true };
    }
    // Spectator — not paid and not eliminated (watching from the stands)
    const isSpectator = !user?.paid && !user?.eliminated;
    if (isSpectator) {
      return { type: "spectator", variant: "thinking", message: lines.missionSpectator, timestamp: 0, durable: true };
    }
    if (you?.survivedToday) {
      return { type: "survived", variant: "proud", message: lines.missionSurvived, timestamp: 0, durable: true };
    }
    if (you?.checkedInToday) {
      return { type: "awaiting_audit", variant: "thinking", message: lines.missionCheckedIn, timestamp: 0, durable: true };
    }
    // Not checked in yet — check if the deadline is approaching
    const closesAt = roundData?.closesAt;
    if (closesAt) {
      const msLeft = new Date(closesAt).getTime() - Date.now();
      if (msLeft > 0 && msLeft < WORRY_THRESHOLD_MS) {
        return { type: "check_in_closing", variant: "worried", message: lines.checkInSubmit, timestamp: 0, durable: true };
      }
    }
    return { type: "check_in_due", variant: "determined", message: lines.missionOpen(roundData?.survivalCap ?? 25, roundData?.placeType || "today's theme"), timestamp: 0, durable: true };
  }

  return { type: "idle", variant: "idle", message: null, timestamp: 0, durable: true };
}

export function MascotEventProvider({ children }) {
  const round = useRound();
  const world = useWorld();
  const lines = useMemo(() => getProfiledMascotLines(), []);

  // Durable baseline — recomputed when round data changes
  const durableEvent = useMemo(
    () => deriveDurable(round, world, lines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round.you, round.isLive, round.isPrelaunch, round.isEnded, round.round, world?.user, lines],
  );

  // Manually dispatched durable override (e.g. "submitting" during check-in)
  const [manualDurable, setManualDurable] = useState(null);
  // Transient event (auto-expiring)
  const [transient, setTransient] = useState(null);
  const transientTimer = useRef(null);

  // Clear transient on unmount
  useEffect(() => () => clearTimeout(transientTimer.current), []);

  /**
   * Dispatch a mascot event.
   * - Transient types (vote_react, achievement, streak, rank_change)
   *   override the baseline for TRANSIENT_MS then expire.
   * - Durable types (submitting, awaiting_audit, etc.) persist until
   *   the round data changes or another durable event is dispatched.
   * - Passing null clears any manual override.
   */
  const dispatchMascotEvent = useCallback((evt) => {
    if (evt === null) {
      setManualDurable(null);
      return;
    }
    if (TRANSIENT_TYPES.has(evt.type)) {
      clearTimeout(transientTimer.current);
      setTransient({ ...evt, timestamp: Date.now(), durable: false });
      transientTimer.current = setTimeout(() => setTransient(null), TRANSIENT_MS);
    } else {
      setManualDurable({ ...evt, timestamp: Date.now(), durable: true });
    }
  }, []);

  // The active event: transient > manual durable > derived durable
  const activeEvent = transient || manualDurable || durableEvent;

  const value = useMemo(
    () => ({
      mascotEvent: activeEvent,
      durableEvent,
      dispatchMascotEvent,
    }),
    [activeEvent, durableEvent, dispatchMascotEvent],
  );

  return (
    <MascotEventContext.Provider value={value}>
      {children}
    </MascotEventContext.Provider>
  );
}
