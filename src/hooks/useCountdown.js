import { useEffect, useState } from "react";

/**
 * useCountdown — shared ticking countdown to an ISO target.
 *
 * Returns the live diff { ms, days, hours, minutes, seconds, totalHours }
 * and re-ticks every `tickMs` (default 1s). Both the big launch Countdown
 * and the Feed's coarse "verdict hour" timer use this so the interval/diff
 * math lives in one place.
 *
 * @param {string|null} targetIso ISO timestamp to count down to
 * @param {number} [tickMs] tick interval in ms (default 1000)
 */
export function useCountdown(targetIso, tickMs = 1000) {
  const targetMs = targetIso ? Date.parse(targetIso) : null;

  const compute = () => {
    const ms = targetMs == null ? 0 : Math.max(0, targetMs - Date.now());
    const totalSec = Math.floor(ms / 1000);
    return {
      ms,
      days: Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      minutes: Math.floor((totalSec % 3600) / 60),
      seconds: totalSec % 60,
      totalHours: ms / 3_600_000,
    };
  };

  const [now, setNow] = useState(compute);

  useEffect(() => {
    if (targetMs == null) return undefined;
    setNow(compute());
    const t = setInterval(() => setNow(compute()), tickMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs, tickMs]);

  return { targetMs, ...now };
}
