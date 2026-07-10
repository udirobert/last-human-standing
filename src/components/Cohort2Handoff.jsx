import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import WaitlistCard from "./WaitlistCard.jsx";
import PushOptIn from "./PushOptIn.jsx";
import Countdown from "./Countdown.jsx";
import { useRound } from "../world/RoundProvider.jsx";

/**
 * Cohort2Handoff — when cohort 1 ends, this is the funnel, not a dead end.
 * Surfaces: carried jury tickets, next-drop countdown, waitlist, push opt-in.
 */
export default function Cohort2Handoff({ youWon = false }) {
  const { you, nextCohort } = useRound();
  const tickets = you?.juryTickets ?? 0;
  const launchAt = nextCohort?.launchAt ?? null;
  const hasLaunch = Boolean(launchAt && !Number.isNaN(Date.parse(launchAt)));
  const [interestDone, setInterestDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("lhs_cohort2_interest") === "1") setInterestDone(true);
    } catch { /* ignore */ }
  }, []);

  const markInterest = () => {
    try { localStorage.setItem("lhs_cohort2_interest", "1"); } catch { /* ignore */ }
    setInterestDone(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-3 text-left"
    >
      <div className="bg-indigo/10 border border-indigo/40 rounded-2xl p-4">
        <p className="font-mono text-indigo text-xs tracking-widest uppercase mb-1">
          Cohort 2 · Next drop
        </p>
        <p className="font-display text-2xl text-bone leading-tight mb-2">
          {youWon ? "Defend the title." : "The next hunt is coming."}
        </p>
        <p className="text-dim font-mono text-xs leading-relaxed mb-3">
          Your jury tickets and detective rank carry forward into the free lottery.
          Stay close — when cohort 2 opens, you&apos;re already in the story.
        </p>

        {hasLaunch ? (
          <div className="bg-ash/60 rounded-xl p-3 mb-3 text-center">
            <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-1">Opens in</p>
            <Countdown targetIso={launchAt} className="font-display text-2xl text-amber" />
          </div>
        ) : (
          <div className="bg-ash/60 rounded-xl p-3 mb-3">
            <p className="font-mono text-xs text-dim">
              Date TBA — join the list and we&apos;ll ping you the moment it drops.
            </p>
          </div>
        )}

        {you?.isAuthed && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-ash/60 rounded-xl p-3 text-center border border-ember/30">
              <p className="font-display text-2xl text-amber tabular-nums">{tickets}</p>
              <p className="font-mono text-[9px] text-dim uppercase">Lottery tickets</p>
            </div>
            <div className="bg-ash/60 rounded-xl p-3 text-center border border-ember/30">
              <p className="font-display text-2xl text-bone tabular-nums">
                {you?.voteAccuracy != null ? `${Math.round(you.voteAccuracy * 100)}%` : "—"}
              </p>
              <p className="font-mono text-[9px] text-dim uppercase">Vote accuracy</p>
            </div>
          </div>
        )}

        {!interestDone ? (
          <button
            type="button"
            onClick={markInterest}
            className="w-full py-3 rounded-xl bg-indigo/30 border border-indigo/50 text-indigo font-display text-sm tracking-widest active:scale-95 transition-transform mb-2"
          >
            I&apos;M IN FOR COHORT 2 →
          </button>
        ) : (
          <p className="text-neon font-mono text-xs text-center mb-2 py-2 rounded-xl bg-neon/10 border border-neon/30">
            ✓ You&apos;re flagged for cohort 2 priority
          </p>
        )}
      </div>

      <WaitlistCard source="cohort_2" variant="cohort2" />
      <PushOptIn />
    </motion.div>
  );
}
