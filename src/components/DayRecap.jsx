import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { getDayRecapMascot, dayRecapContinueLabel } from "../lib/copy.js";
import { resolveTomorrow } from "../lib/tomorrow.js";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { HumanCta } from "./ui/CraftCta.jsx";
import { CeremonyShell } from "./ui/Ceremony.jsx";
import { Stat, StatGrid } from "./ui/StatGrid.jsx";

/**
 * DayRecap — a cinematic full-screen overlay shown when a day closes.
 *
 * Uses real stats from the game state (lastDayClose) to show:
 *   - "DAY X CLOSED" in large type
 *   - Real survived / eliminated / DQ'd counts
 *   - Remaining humans count
 *   - Personal result (did YOU survive?)
 *   - Auto-dismisses after 6s or on tap
 */
const RECAP_KEY = "lhs_day_recap_seen";

export default function DayRecap() {
  const { isLive, currentDay, lastDayClose, you } = useRound();
  const [show, setShow] = useState(false);
  const [recapData, setRecapData] = useState(null);

  useEffect(() => {
    if (!isLive || !lastDayClose) return;

    try {
      const seen = localStorage.getItem(RECAP_KEY);
      const seenDay = seen ? parseInt(seen, 10) : null;

      // Show recap if we haven't seen this day's close yet
      if (seenDay == null || seenDay < lastDayClose.day) {
        setRecapData(lastDayClose);
        setShow(true);
        localStorage.setItem(RECAP_KEY, String(lastDayClose.day));
      }
    } catch {
      // localStorage may be unavailable (private browsing)
    }
  }, [isLive, lastDayClose]);

  // Listen for push notifications about day closes
  useEffect(() => {
    const handler = (event) => {
      const data = event?.data || {};
      if (data.type === "verdict" || data.type === "day_closed") {
        if (data.day != null) {
          setRecapData({
            day: data.day,
            survivors: data.survivors ?? null,
            eliminated: data.eliminated ?? null,
            dq: data.dq ?? null,
            remaining: data.remaining ?? null,
          });
          setShow(true);
          try { localStorage.setItem(RECAP_KEY, String(data.day)); } catch { /* private browsing */ }
        }
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, []);

  const dismiss = useCallback(() => setShow(false), []);

  const survived = recapData?.survivors ?? "—";
  const eliminated = recapData?.eliminated ?? "—";
  const dq = recapData?.dq ?? "—";
  const remaining = recapData?.remaining ?? "—";
  const day = recapData?.day ?? "—";
  // Seed lottery ran this day (field overflowed the cap) — stage the draw.
  const draw = recapData?.draw ?? null;

  // Animating cut: the "remaining" count burns down from the pre-cut total
  // (survived + eliminated + DQ'd) to the post-cut remaining over ~1.2s.
  // Push payloads can omit any count — only animate when every number is
  // finite and the cut is real; otherwise render the plain value ("—").
  const preCutTotal =
    Number.isFinite(Number(survived)) &&
    Number.isFinite(Number(eliminated)) &&
    Number.isFinite(Number(dq))
      ? Number(survived) + Number(eliminated) + Number(dq)
      : null;
  const postCut = Number(remaining);
  const canAnimate = show && preCutTotal != null && Number.isFinite(postCut) && postCut < preCutTotal;
  const [displayCount, setDisplayCount] = useState(null);
  const animFrameRef = useRef(null);
  useEffect(() => {
    if (!show) return undefined;
    if (!canAnimate) {
      setDisplayCount(null);
      return undefined;
    }
    const start = preCutTotal;
    const end = postCut;
    setDisplayCount(start); // paint the pre-cut total before the first frame
    const durationMs = 1200;
    const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // ease-out cubic for a "settling" feel
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.round(start + (end - start) * eased));
      if (t < 1) animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [show, canAnimate, preCutTotal, postCut]);
  const shownRemaining = displayCount != null ? displayCount : remaining;

  // Personal result
  const youSurvived = you?.survivedToday === true;
  const youEliminated = you?.isEliminated === true && you?.eliminatedAtDay === day;
  const personalResult = youSurvived ? "survived" : youEliminated ? "eliminated" : null;
  const recapMascot = getDayRecapMascot({ personalResult });
  const tomorrow = resolveTomorrow(recapData?.day ?? currentDay, {
    remaining: recapData?.remaining,
  });
  const continueLabel = dayRecapContinueLabel({
    personalResult,
    currentDay: recapData?.day ?? currentDay,
    nextTheme: tomorrow?.theme ?? null,
  });

  return (
    <CeremonyShell
      open={show}
      onDismiss={dismiss}
      label="Day recap"
      spring="gentle"
    >
      <p className="font-mono text-dim text-sm tracking-widest uppercase mb-3">
        Day {day} closed
      </p>
      <p className="font-display text-5xl text-bone leading-none mb-4 animate-glow">
        Verdicts in
      </p>
      <MotifFrieze className="w-full mb-5" />

      <div className="flex justify-center mb-5">
        <MascotGuide
          variant={recapMascot.variant}
          size={64}
          message={recapMascot.message}
          position="top"
        />
      </div>

      {personalResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mb-6 inline-block px-4 py-2 rounded-full border ${
            personalResult === "survived"
              ? "bg-neon/10 border-neon/40 text-neon"
              : "bg-blood/10 border-blood/40 text-blood"
          }`}
        >
          <p className="font-mono text-sm font-bold">
            {personalResult === "survived" ? "You survived" : "You were eliminated"}
          </p>
        </motion.div>
      )}

      <StatGrid boxed className="max-w-sm mx-auto">
        <Stat label="Survived" value={survived} tone="neon" boxed />
        <Stat label="Eliminated" value={eliminated} tone="blood" boxed />
        <Stat label="DQ'd" value={dq} tone="amber" boxed />
      </StatGrid>

      {/* The draw — staged when the seed lottery decided survival
          (field overflowed the cap). Fairness as spectacle, not a
          footnote (Riddle Rounds §5.1). */}
      {draw && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 max-w-sm mx-auto rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-left"
        >
          <p className="font-mono text-amber text-[10px] uppercase tracking-widest mb-1">
            The draw decided today
          </p>
          <p className="text-bone/80 font-body text-xs leading-relaxed">
            {draw.eligible} were eligible for {draw.cap} slots — the seed
            lottery chose who stays. Not speed. The draw is public and
            replayable from the cohort seed.
          </p>
          <p className="font-mono text-dim/60 text-[9px] mt-1.5 break-all">
            seed {draw.seed} · {draw.algorithm}
          </p>
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-bone font-body text-sm mt-6"
      >
        <span className="font-display text-2xl text-amber tabular-nums">{shownRemaining}</span> humans remain
      </motion.p>

      {tomorrow && personalResult !== "eliminated" && (
        <p className="font-mono text-dim text-[10px] mt-4 tracking-wide">
          Riddle waiting downstairs · {tomorrow.emoji} {tomorrow.theme}
        </p>
      )}

      <HumanCta onClick={dismiss} className="mt-6">
        {continueLabel}
      </HumanCta>

      <AutoDismiss onDismiss={dismiss} />
    </CeremonyShell>
  );
}

function AutoDismiss({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return null;
}
