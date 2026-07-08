import { motion } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";

/**
 * ArsenalCard — makes the player's "currency" visible.
 *
 * Jury tickets, referral count, check-in streak, and vote accuracy
 * are all earned through play but were previously invisible. This
 * card surfaces them in one place so players can see their progress
 * and feel rewarded for engagement.
 *
 * Shown on GameHome for authed players (live + prelaunch).
 */
export default function ArsenalCard() {
  const { you } = useRound();
  const { user } = useWorld();

  const juryTickets = you?.juryTickets ?? 0;
  const streak = you?.checkinStreak ?? 0;
  const votesResolved = you?.votesResolved ?? 0;
  const votesCorrect = you?.votesCorrect ?? 0;
  const accuracy = votesResolved > 0 ? Math.round((votesCorrect / votesResolved) * 100) : null;
  const referrals = user?.referralCount ?? 0;
  const isJury = you?.isJury ?? false;

  // Don't show for unauthed users or users with zero everything
  const hasAnything = juryTickets > 0 || streak > 0 || votesResolved > 0 || referrals > 0;
  if (!you?.isAuthed || !hasAnything) return null;

  const stats = [
    { label: "Jury Tickets", value: juryTickets, icon: "⚖️", tone: "amber" },
    { label: "Streak", value: `${streak}🔥`, tone: "neon" },
    { label: "Referrals", value: referrals, tone: "bone" },
    {
      label: "Vote Accuracy",
      value: accuracy != null ? `${accuracy}%` : "—",
      tone: accuracy != null && accuracy >= 80 ? "neon" : "dim",
    },
  ];

  // Sunk cost framing: "X days invested" makes the accumulated effort visible
  // at every glance, not just when the streak is at risk.
  const daysInvested = you?.eliminatedAtDay ?? (you?.checkinStreak ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
      className="mx-5 mb-3 bg-smoke/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest">Your Arsenal</p>
        {isJury && (
          <span className="font-mono text-[9px] text-amber bg-amber/10 px-2 py-0.5 rounded-full border border-amber/30">
            ⚖️ JURY · ×2
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className={`font-display text-xl leading-none ${
              s.tone === "amber" ? "text-amber" :
              s.tone === "neon" ? "text-neon" :
              s.tone === "bone" ? "text-bone" : "text-dim"
            }`}>
              {s.value}
            </p>
            <p className="text-dim text-[8px] font-mono uppercase mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Sunk cost footer — makes accumulated investment visible at every glance */}
      {daysInvested > 0 && (
        <p className="text-dim/70 text-[9px] font-mono mt-2 text-center border-t border-ember/20 pt-2">
          {daysInvested} day{daysInvested !== 1 ? "s" : ""} invested — don't lose your progress
        </p>
      )}
    </motion.div>
  );
}
