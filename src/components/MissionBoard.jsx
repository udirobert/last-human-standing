import { useEffect, useState } from "react";
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

export default function MissionBoard({ onCheckIn, onViewFeed, user }) {
  const { phase, isLive, isEnded, currentDay, round, you, winner } = useRound();

  // "Closing soon" pulse: recompute once a minute from a state
  // variable so the JSX is render-pure. (Date.now() in render
  // trips the react-hooks/purity rule.)
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const msRemaining = round?.closesAt ? Math.max(0, new Date(round.closesAt).getTime() - nowMs) : null;
  const minutesLeft = msRemaining !== null ? Math.floor(msRemaining / 60000) : null;
  const closingSoon = minutesLeft !== null && minutesLeft < 60;

  const isSpectator = isLive && !user?.paid && !user?.eliminated;
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
        <p className="font-mono text-amber text-xs tracking-widest uppercase mb-2">Pre-game</p>
        <p className="font-display text-2xl text-bone mb-2">You're registered</p>
        <p className="text-dim text-sm font-mono leading-relaxed">
          When the game starts, you will get a daily theme, a check-in window, and a race for the first {cap} spots.
        </p>
        <div className="mt-3">
          <TrustBadge size="md" />
        </div>
      </motion.div>
    );
  }

  if (isEnded) {
    const youWon = Boolean(
      winner?.address && you?.address && winner.address.toLowerCase() === you.address.toLowerCase(),
    );
    const winnerName = winner?.username
      ? `@${winner.username}`
      : winner?.address
        ? `${winner.address.slice(0, 6)}…${winner.address.slice(-4)}`
        : null;
    const shareWin = async () => {
      const text = youWon
        ? `🏆 I am the LAST HUMAN STANDING. I outlasted the whole cohort.`
        : `🏆 ${winnerName ?? "One human"} just won Last Human Standing. Next cohort is coming — get in.`;
      const url = window.location.origin;
      try {
        if (navigator.share) {
          await navigator.share({ text, url });
        } else {
          await navigator.clipboard.writeText(`${text} ${url}`);
        }
      } catch { /* user dismissed the share sheet */ }
    };
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-5 mb-4 bg-smoke border border-amber/40 rounded-3xl p-6 text-center"
      >
        <p className="text-6xl mb-3">🏆</p>
        {youWon ? (
          <>
            <p className="font-display text-3xl text-amber mb-1">YOU ARE THE LAST HUMAN STANDING</p>
            <p className="text-dim text-sm font-mono">The pot is yours. Payout lands from the prize wallet.</p>
          </>
        ) : (
          <>
            <p className="font-mono text-amber text-xs tracking-widest uppercase mb-2">Game over</p>
            <p className="font-display text-3xl text-bone mb-1">
              {winnerName ? `${winnerName} outlasted everyone` : "The cohort has ended"}
            </p>
            <p className="text-dim text-sm font-mono">One human took the pot. The next cohort is coming.</p>
          </>
        )}
        <button
          onClick={shareWin}
          className="w-full mt-4 py-4 rounded-2xl bg-amber text-ash font-display text-xl tracking-widest active:scale-95 transition-transform"
        >
          {youWon ? "SHARE YOUR VICTORY" : "SHARE THE RESULT"}
        </button>
        <button
          onClick={onViewFeed}
          className="w-full mt-2 py-3 rounded-xl bg-ash border border-ember text-bone font-mono text-sm active:scale-95 transition-transform"
        >
          Relive the final audit →
        </button>
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
            <p className={closingSoon ? 'text-amber font-mono text-sm font-semibold mt-1 animate-pulse' : 'text-amber text-[10px] font-mono mt-1'}>
              {closingSoon ? '⏳ Closes ' : 'Closes '}
              <Countdown targetIso={round.closesAt} className="inline font-mono" />
            </p>
          )}
        </div>
        <div className="bg-ash rounded-xl p-3 border border-ember">
          <p className="text-dim text-[10px] font-mono uppercase">Spots left</p>
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
        round?.status === "closed" ? (
          <div className={`${survived ? "bg-neon/10 border-neon/30" : "bg-blood/10 border-blood/30"} border rounded-xl p-3 mb-3`}>
            <p className={`font-display text-xl ${survived ? "text-neon" : "text-blood"}`}>
              {survived ? `Verdict is in — you made the cut ✅` : `Verdict is in — you're out 💀`}
            </p>
            <p className="text-dim text-xs font-mono mt-1">
              {survived
                ? `Day ${currentDay ?? "—"} closed at rank #${rank ?? "—"}. Next theme drops soon.`
                : "The crowd has spoken. You're on the jury now — accurate votes count double."}
            </p>
          </div>
        ) : (
          <div className="bg-neon/10 border border-neon/30 rounded-xl p-3 mb-3">
            <p className="font-display text-xl text-neon">
              {survived ? `Surviving · Rank #${rank ?? "—"}` : `Checked in · Rank #${rank ?? "—"}`}
            </p>
            <p className="text-dim text-xs font-mono mt-1">
              {survived
                ? "Hold your spot — the audit verdict lands when the window closes. Flagged players get replaced."
                : "At risk until day closes — if the audit disqualifies a survivor, you inherit their slot."}
            </p>
          </div>
        )
      ) : isSpectator ? (
        <div className="space-y-2 mb-3">
          <div className="bg-ash/70 border border-ember/40 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🔭</span>
              <p className="font-mono text-dim text-xs uppercase tracking-widest">
                Spectator mode
              </p>
            </div>
            <p className="text-bone text-sm font-mono">
              You're not in this cohort. You can audit, vote, and chat — but no check-in.
            </p>
          </div>
          <button
            onClick={onViewFeed}
            className="w-full py-3 rounded-xl bg-blood text-bone font-display text-base tracking-widest active:scale-95 transition-transform"
          >
            OPEN AUDIT FEED →
          </button>
        </div>
      ) : (
        <button
          onClick={onCheckIn}
          className="w-full mb-3 bg-blood text-bone font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform animate-pulse-blood"
        >
          CHECK IN NOW
        </button>
      )}

      {!isSpectator && (
        <button
          onClick={onViewFeed}
          className="w-full py-3 rounded-xl bg-ash border border-ember text-bone font-mono text-sm active:scale-95 transition-transform"
        >
          Open audit feed → vote HUMAN or SUS
        </button>
      )}
    </motion.div>
  );
}
