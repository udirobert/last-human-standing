import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";
import { resolveTomorrow, tomorrowPostcardKey } from "../lib/tomorrow.js";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import { HumanCta, GhostLink } from "./ui/CraftCta.jsx";
import Countdown from "./Countdown.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";
import { setFeedIntent } from "../lib/feedIntent.js";

/**
 * Post-close "tomorrow postcard" — theme + cut + opens countdown.
 * Once per closed day (localStorage). Does not stack with day-open ceremonies:
 * only while still on the closed day (currentDay === lastDayClose.day).
 */
export default function TomorrowPostcard({ onViewFeed }) {
  const { phase, currentDay, round, lastDayClose, you } = useRound();
  const { entryPaid, user } = useWorld();
  const isReserved = Boolean(entryPaid || user?.paid);

  const closedDay = lastDayClose?.day ?? null;
  const tomorrow = resolveTomorrow(closedDay, { remaining: lastDayClose?.remaining });
  const key = tomorrowPostcardKey(closedDay);

  // Only while the closed day is still current — hide once Day N+1 opens
  // (ThemeReveal / ReturnJobCard take over; no ceremony stack).
  const stillOnClosedDay =
    phase === "live" &&
    tomorrow &&
    currentDay != null &&
    Number(currentDay) === Number(closedDay) &&
    (round?.status === "closed" || round == null);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isReserved || !key || !stillOnClosedDay) {
      setOpen(false);
      return;
    }
    try {
      setOpen(localStorage.getItem(key) !== "1");
    } catch {
      setOpen(true);
    }
  }, [isReserved, key, stillOnClosedDay]);

  const dismiss = useCallback(() => {
    if (key) {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }, [key]);

  if (!stillOnClosedDay || !tomorrow || !open) return null;

  const eliminated = Boolean(you?.isEliminated);
  const survived = Boolean(you?.survivedToday) && !eliminated;

  const handleCta = () => {
    dismiss();
    setFeedIntent({ filter: "pending" });
    onViewFeed?.();
  };

  const cutLine =
    tomorrow.remaining != null && tomorrow.cap != null
      ? `${tomorrow.remaining} still standing · next cut ${tomorrow.cap}`
      : tomorrow.cap != null
        ? `Next cut · ${tomorrow.cap} seat${tomorrow.cap !== 1 ? "s" : ""}`
        : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
          className="mx-5 mb-3"
        >
          <div
            className={`relative overflow-hidden rounded-3xl border px-5 py-5 text-center ${
              eliminated
                ? "border-ember/40 bg-smoke/90"
                : "border-neon/35 bg-smoke/90"
            }`}
          >
            <div
              className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none"
              aria-hidden="true"
            >
              <ThemeMotif emoji={tomorrow.emoji} size={180} />
            </div>

            <div className="relative">
              <div className="flex justify-center mb-3">
                <ThemeMotif
                  emoji={tomorrow.emoji}
                  size={72}
                  label={tomorrow.theme}
                />
              </div>

              <p
                className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-1 ${
                  eliminated ? "text-amber" : "text-neon"
                }`}
              >
                {eliminated ? "Still in the room" : "Tomorrow's return"}
              </p>

              <p className="font-display text-2xl text-bone leading-tight mb-1">
                Day {tomorrow.day} · {tomorrow.theme}
              </p>

              {tomorrow.dayLabel && (
                <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-2">
                  {tomorrow.dayLabel}
                  {tomorrow.date ? ` · ${tomorrow.date}` : ""}
                </p>
              )}

              <p className="font-body text-bone/70 text-sm leading-snug max-w-xs mx-auto mb-2">
                {eliminated
                  ? "You're not racing — audit the living until the next window opens."
                  : survived
                    ? `One photo. ${tomorrow.cap ?? "—"} seats. Be there.`
                    : `Day ${tomorrow.day} opens with a new theme. Hold the line.`}
              </p>

              {cutLine && (
                <p className="font-mono text-dim text-[10px] tabular-nums mb-3">
                  {cutLine}
                </p>
              )}

              {tomorrow.opensAt && (
                <div className="mb-4">
                  <p className="font-mono text-dim text-[9px] uppercase tracking-widest mb-1">
                    Opens
                  </p>
                  <Countdown
                    targetIso={tomorrow.opensAt}
                    className="font-display text-3xl text-bone tabular-nums"
                  />
                </div>
              )}

              {onViewFeed && (
                <HumanCta onClick={handleCta} className="mb-2">
                  {eliminated
                    ? "Enter the audit →"
                    : `Hold for Day ${tomorrow.day} · watch the field →`}
                </HumanCta>
              )}

              <GhostLink onClick={dismiss} className="mt-1">
                {onViewFeed ? "Dismiss" : "Got it — see you tomorrow"}
              </GhostLink>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Durable compact strip for MissionBoard after day close (survived path).
 * Always visible while still on the closed day — postcard dismiss doesn't erase it.
 */
export function TomorrowReturnStrip() {
  const { phase, currentDay, round, lastDayClose, you } = useRound();
  const closedDay = lastDayClose?.day ?? currentDay;
  const tomorrow = resolveTomorrow(closedDay, { remaining: lastDayClose?.remaining });

  const visible =
    phase === "live" &&
    tomorrow &&
    Boolean(you?.survivedToday) &&
    !you?.isEliminated &&
    currentDay != null &&
    Number(currentDay) === Number(closedDay) &&
    round?.status === "closed";

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-neon/25 bg-neon/5 px-3 py-3 text-center">
      <div className="flex justify-center mb-2">
        <ThemeMotif emoji={tomorrow.emoji} size={40} label={tomorrow.theme} />
      </div>
      <p className="font-mono text-neon text-[10px] uppercase tracking-[0.18em] mb-1">
        Tomorrow&apos;s return
      </p>
      <p className="font-display text-lg text-bone leading-tight mb-1">
        Day {tomorrow.day} · {tomorrow.theme}
      </p>
      <p className="font-body text-bone/75 text-xs leading-snug mb-2">
        One photo. {tomorrow.cap ?? "—"} seats. One chance.
      </p>
      {tomorrow.remaining != null && tomorrow.cap != null && (
        <p className="font-mono text-dim text-[10px] tabular-nums mb-2">
          {tomorrow.remaining} still standing · next cut {tomorrow.cap}
        </p>
      )}
      {tomorrow.opensAt && (
        <div>
          <p className="font-mono text-dim text-[9px] uppercase tracking-widest mb-0.5">
            Opens
          </p>
          <Countdown
            targetIso={tomorrow.opensAt}
            className="font-display text-xl text-bone tabular-nums"
          />
        </div>
      )}
    </div>
  );
}
