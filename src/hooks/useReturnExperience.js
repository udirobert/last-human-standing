import { useCallback, useEffect, useRef, useState } from "react";
import { useRound } from "../world/RoundProvider.jsx";
import {
  readReturnState,
  writeReturnState,
  detectEliminationWhileAway,
  computeDaysAway,
} from "../lib/returnState.js";

/**
 * useReturnExperience — observes the first authenticated game-state load of a
 * visit and derives what changed since the player was last here. Powers the
 * "return experience" overlays:
 *
 *   - eliminatedWhileAway: last-known was ALIVE, server now says ELIMINATED
 *     (emotional-payoff discovery + explain why)
 *   - daysAway + missedDays: how many round days advanced while they were away
 *     ("you missed Day 4 & 5 …")
 *   - phaseEndedWhileAway: an already-ended game on return
 *
 * It commits a snapshot exactly once per authenticated visit (guarded by a
 * ref) so the 15s polling never re-fires the beats. The snapshot is only
 * written once we have REAL server data about this player (you.isAuthed),
 * so a non-authed visitor can't trigger a false "eliminated while away".
 *
 * @returns {{
 *   eliminatedWhileAway: boolean,
 *   daysAway: number,
 *   missedDays: number[],
 *   phaseEndedWhileAway: boolean,
 *   dismiss: () => void,
 * }}
 */
export function useReturnExperience() {
  const { phase, currentDay, you } = useRound();
  const committedRef = useRef(false);
  const prevRef = useRef(readReturnState());

  const [eliminatedWhileAway, setEliminatedWhileAway] = useState(false);
  const [daysAway, setDaysAway] = useState(0);
  const [missedDays, setMissedDays] = useState([]);
  const [phaseEndedWhileAway, setPhaseEndedWhileAway] = useState(false);

  const dayNum = Number(currentDay);

  useEffect(() => {
    if (committedRef.current) return;
    // Wait for real server data about this player before recording anything.
    if (phase !== "live" && phase !== "ended") return;
    if (!you?.isAuthed) return;

    committedRef.current = true;
    const prev = prevRef.current;
    const next = {
      status: you?.isEliminated ? "eliminated" : "alive",
      day: Number.isFinite(dayNum) && dayNum > 0 ? dayNum : prev?.day,
      checkedIn: Boolean(you?.checkedInToday),
      ts: Date.now(),
    };

    if (detectEliminationWhileAway(prev, next)) {
      setEliminatedWhileAway(true);
    }

    const away = computeDaysAway(prev?.day, next.day);
    if (away > 0) {
      setDaysAway(away);
      // Missed days are the ones strictly between the last-seen day and today.
      const missed = [];
      if (Number.isFinite(prev?.day)) {
        for (let d = Number(prev.day) + 1; d < Number(next.day); d++) missed.push(d);
      }
      setMissedDays(missed);
    }

    if (phase === "ended" && prev) setPhaseEndedWhileAway(true);

    writeReturnState(next);
  }, [phase, you?.isAuthed, you?.isEliminated, you?.checkedInToday, dayNum]);

  const dismiss = useCallback(() => {
    setEliminatedWhileAway(false);
    setDaysAway(0);
    setMissedDays([]);
    setPhaseEndedWhileAway(false);
    committedRef.current = true; // don't re-fire on later polls this visit
  }, []);

  return { eliminatedWhileAway, daysAway, missedDays, phaseEndedWhileAway, dismiss };
}

export default useReturnExperience;
