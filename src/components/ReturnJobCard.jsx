import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";
import { COHORT_SCHEDULE, resolveActiveTheme, findTheme } from "../data/game.js";
import { survivalRule } from "../lib/copy.js";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import { HumanCta, GhostLink } from "./ui/CraftCta.jsx";
import Countdown from "./Countdown.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";
import { setFeedIntent } from "../lib/feedIntent.js";

function storageKey(phase, currentDay) {
  if (phase === "prelaunch") return "lhs_return_job_prelaunch";
  if (phase === "live" && currentDay != null) return `lhs_return_job_day_${currentDay}`;
  return null;
}

function resolveJob({ phase, launchAt, currentDay, round, you }) {
  if (phase === "prelaunch") {
    const day1 = COHORT_SCHEDULE[0];
    const themeMeta = findTheme(day1.theme) || day1;
    return {
      eyebrow: "Your next job",
      title: `Day 1 · ${day1.theme}`,
      body: `${day1.cap} seats. One photo. Be there when it opens.`,
      emoji: day1.emoji || themeMeta.emoji || "☕",
      themeLabel: day1.theme,
      countdownIso: launchAt,
      cta: null,
      ctaLabel: null,
      mode: "prelaunch",
    };
  }

  if (phase === "live") {
    const theme = resolveActiveTheme(round);
    const cap = round?.survivalCap ?? COHORT_SCHEDULE.find((d) => d.day === currentDay)?.cap ?? "—";
    const eliminated = Boolean(you?.isEliminated);
    const checkedIn = Boolean(you?.checkedInToday);

    if (eliminated) {
      return {
        eyebrow: "Your job now",
        title: `Day ${currentDay ?? "—"} · Watch the field`,
        body: "You're on the jury. Audit the living — accurate votes still matter.",
        emoji: theme.emoji,
        themeLabel: theme.theme,
        countdownIso: null,
        cta: "audit",
        ctaLabel: "Enter the audit →",
        mode: "jury",
      };
    }

    if (checkedIn) {
      return null; // MissionBoard shelf owns post-seal
    }

    return {
      eyebrow: "Today's job",
      title: `Day ${currentDay ?? "—"} · ${theme.theme}`,
      body: survivalRule(cap),
      emoji: theme.emoji,
      themeLabel: theme.theme,
      countdownIso: round?.closesAt || null,
      countdownLabel: "Window closes",
      cta: "checkin",
      ctaLabel: "Check in now →",
      mode: "open",
    };
  }

  return null;
}

/**
 * Personal return landing — theme + one job on first paint for the day.
 * Cold countdown/cap; warm motif. Dismissible; once per day (localStorage).
 */
export default function ReturnJobCard({ onCheckIn, onViewFeed }) {
  const { phase, launchAt, currentDay, round, you } = useRound();
  const { entryPaid, user } = useWorld();
  const isReserved = Boolean(entryPaid || user?.paid);
  const key = storageKey(phase, currentDay);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isReserved || !key) {
      setOpen(false);
      return;
    }
    try {
      setOpen(localStorage.getItem(key) !== "1");
    } catch {
      setOpen(true);
    }
  }, [isReserved, key]);

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

  const job = resolveJob({ phase, launchAt, currentDay, round, you });
  if (!job || !open) return null;

  const handleCta = () => {
    dismiss();
    if (job.cta === "checkin" && onCheckIn) onCheckIn();
    else if (job.cta === "audit" && onViewFeed) {
      setFeedIntent({ filter: "pending" });
      onViewFeed();
    }
  };

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
          <div className="relative overflow-hidden rounded-3xl border border-amber/40 bg-smoke/90 px-5 py-5 text-center">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none" aria-hidden="true">
              <ThemeMotif emoji={job.emoji} size={180} />
            </div>

            <div className="relative">
              <div className="flex justify-center mb-3">
                <ThemeMotif emoji={job.emoji} size={72} label={job.themeLabel} />
              </div>
              <p className="font-mono text-amber text-xs uppercase tracking-[0.2em] mb-1">
                {job.eyebrow}
              </p>
              <p className="font-display text-2xl text-bone leading-tight mb-2">{job.title}</p>
              <p className="font-body text-bone/80 text-sm leading-snug max-w-xs mx-auto mb-3">
                {job.body}
              </p>

              {job.countdownIso && (
                <div className="mb-4">
                  {job.countdownLabel && (
                    <p className="font-mono text-bone/70 text-xs uppercase tracking-widest mb-1">
                      {job.countdownLabel}
                    </p>
                  )}
                  <Countdown
                    targetIso={job.countdownIso}
                    className="font-display text-3xl text-bone tabular-nums"
                  />
                </div>
              )}

              {job.cta ? (
                <HumanCta onClick={handleCta} className="mb-2">
                  {job.ctaLabel}
                </HumanCta>
              ) : null}

              <GhostLink onClick={dismiss} className="mt-1">
                {job.cta ? "Dismiss" : "Got it — hold the line"}
              </GhostLink>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
