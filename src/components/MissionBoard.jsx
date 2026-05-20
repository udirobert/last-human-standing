import { motion } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { DAILY_THEMES, TODAY_THEME } from "../data/game";
import Countdown from "./Countdown.jsx";
import TrustBadge from "./TrustBadge.jsx";

function formatWindow(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

export default function MissionBoard({ onCheckIn, onViewFeed, isDemoMode }) {
  const { phase, isLive, currentDay, round, you } = useRound();

  const themeLabel = round?.placeType || round?.name || TODAY_THEME.theme;
  const themeData = DAILY_THEMES.find((t) => t.theme === themeLabel) || TODAY_THEME;
  const opens = formatWindow(round?.opensAt);
  const closes = formatWindow(round?.closesAt);
  const slotsLeft = round?.slotsRemaining ?? null;
  const cap = round?.survivalCap ?? 25;

  const checkedIn = Boolean(you?.checkedInToday);
  const survived = you?.survivedToday;
  const rank = you?.rankToday;
  const eliminated = Boolean(you?.isEliminated);

  if (phase === "prelaunch") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mb-4 bg-smoke border border-amber/30 rounded-3xl p-5"
      >
        <p className="font-mono text-amber text-xs tracking-widest uppercase mb-2">Before Day 1</p>
        <p className="font-display text-2xl text-bone mb-2">Reserve your slot</p>
        <p className="text-dim text-sm font-mono leading-relaxed">
          When the cohort launches, you will get a daily theme, a check-in window, and a race for the first {cap} survivors.
        </p>
        <div className="mt-3">
          <TrustBadge size="md" />
        </div>
      </motion.div>
    );
  }

  if (!isLive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 bg-smoke border border-neon/25 rounded-3xl p-5 relative overflow-hidden"
    >
      {isDemoMode && (
        <p className="absolute top-3 right-3 font-mono text-[10px] text-amber uppercase tracking-wider">
          Demo data
        </p>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-mono text-neon text-xs tracking-widest uppercase">Today&apos;s mission · Day {currentDay ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl">{themeData.emoji}</span>
            <p className="font-display text-3xl text-bone leading-tight">{themeLabel}</p>
          </div>
        </div>
        <TrustBadge />
      </div>

      {round?.prompt && (
        <p className="text-dim text-sm font-mono mb-3">📸 {round.prompt}</p>
      )}
      <p className="text-dim text-xs font-mono mb-4">{themeData.description}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-ash rounded-xl p-3 border border-ember">
          <p className="text-dim text-[10px] font-mono uppercase">Check-in window</p>
          <p className="text-bone font-mono text-sm mt-1">
            {opens && closes ? `${opens} – ${closes}` : "Set by admin"}
          </p>
          {round?.closesAt && (
            <p className="text-amber text-[10px] font-mono mt-1">
              Closes <Countdown targetIso={round.closesAt} className="inline font-mono" />
            </p>
          )}
        </div>
        <div className="bg-ash rounded-xl p-3 border border-ember">
          <p className="text-dim text-[10px] font-mono uppercase">Survival slots</p>
          <p className="text-bone font-display text-2xl mt-0.5">
            {slotsLeft != null ? slotsLeft : "—"}
            <span className="text-dim text-sm font-mono"> / {cap}</span>
          </p>
        </div>
      </div>

      {eliminated ? (
        <div className="bg-blood/10 border border-blood/30 rounded-xl p-3 mb-3">
          <p className="font-display text-xl text-blood">Eliminated</p>
          <p className="text-dim text-xs font-mono mt-1">You can still audit, vote, and chat.</p>
        </div>
      ) : checkedIn ? (
        <div className="bg-neon/10 border border-neon/30 rounded-xl p-3 mb-3">
          <p className="font-display text-xl text-neon">
            {survived ? `Surviving · Rank #${rank ?? "—"}` : `Checked in · Rank #${rank ?? "—"}`}
          </p>
          <p className="text-dim text-xs font-mono mt-1">
            {survived ? "Hold your spot — crowd audit runs after check-in closes." : "At risk until day closes."}
          </p>
        </div>
      ) : (
        <button
          onClick={onCheckIn}
          className="w-full mb-3 bg-blood text-bone font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform animate-pulse-blood"
        >
          CHECK IN NOW
        </button>
      )}

      <button
        onClick={onViewFeed}
        className="w-full py-3 rounded-xl bg-ash border border-ember text-bone font-mono text-sm active:scale-95 transition-transform"
      >
        Open audit feed → vote HUMAN or SUS
      </button>
    </motion.div>
  );
}
