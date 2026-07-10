import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { DAILY_THEMES, TODAY_THEME } from "../data/game";
import { missionMantra } from "../lib/copy.js";
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
  const { phase, isLive, isEnded, currentDay, round, you, winner, payout } = useRound();

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
        {/* Winner trophy with cinematic glow */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
          className="mb-3"
        >
          <span className="text-7xl inline-block">🏆</span>
        </motion.div>

        {youWon ? (
          <>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-3xl text-amber mb-1 animate-glow"
            >
              YOU ARE THE LAST HUMAN STANDING
            </motion.p>
            <p className="text-dim text-sm font-mono">The pot is yours. Payout lands from the prize wallet.</p>

            {/* Winner's personal stats — the "end" in peak-end rule */}
            <div className="mt-4 grid grid-cols-3 gap-2 bg-ash/60 rounded-xl p-3">
              <div>
                <p className="font-display text-2xl text-amber">{currentDay ?? 5}</p>
                <p className="text-dim text-[9px] font-mono uppercase">Days</p>
              </div>
              <div>
                <p className="font-display text-2xl text-amber">{you?.checkinStreak ?? 0}🔥</p>
                <p className="text-dim text-[9px] font-mono uppercase">Streak</p>
              </div>
              <div>
                <p className="font-display text-2xl text-amber">{you?.juryTickets ?? 0}</p>
                <p className="text-dim text-[9px] font-mono uppercase">Tickets</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="font-mono text-amber text-xs tracking-widest uppercase mb-2">Game over</p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-3xl text-bone mb-1"
            >
              {winnerName ? `${winnerName} outlasted everyone` : "The cohort has ended"}
            </motion.p>
            <p className="text-dim text-sm font-mono">One human took the pot. The next cohort is coming.</p>

            {/* Your run recap — make the end feel personal */}
            {you?.isAuthed && (
              <div className="mt-4 grid grid-cols-3 gap-2 bg-ash/60 rounded-xl p-3">
                <div>
                  <p className="font-display text-2xl text-bone">{you?.eliminatedAtDay ?? currentDay ?? "—"}</p>
                  <p className="text-dim text-[9px] font-mono uppercase">Days</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-bone">{you?.checkinStreak ?? 0}🔥</p>
                  <p className="text-dim text-[9px] font-mono uppercase">Streak</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-bone">{you?.juryTickets ?? 0}</p>
                  <p className="text-dim text-[9px] font-mono uppercase">Tickets</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Payout status */}
        {payout && (
          <div className="mt-4 bg-ash/60 border border-ember/30 rounded-xl p-3 text-left">
            <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-1">Prize payout</p>
            {payout.status === "submitted" || payout.status === "confirmed" ? (
              <>
                <p className="text-neon font-mono text-sm">
                  ✅ {payout.amount_usd} {payout.token} sent onchain
                </p>
                {payout.explorer_url && (
                  <a href={payout.explorer_url} target="_blank" rel="noopener noreferrer"
                     className="text-neon/70 font-mono text-xs underline mt-1 inline-block">
                    View transaction →
                  </a>
                )}
              </>
            ) : payout.status === "pending" ? (
              <p className="text-amber font-mono text-sm">⏳ Payout in progress…</p>
            ) : payout.status === "failed" ? (
              <p className="text-blood font-mono text-sm">
                ⚠️ Payout pending manual review. The winner will receive their prize shortly.
              </p>
            ) : null}
          </div>
        )}

        <button
          onClick={shareWin}
          className="w-full mt-4 py-4 rounded-2xl bg-amber text-ash font-display text-xl tracking-widest active:scale-95 transition-transform"
        >
          {youWon ? "SHARE YOUR VICTORY" : "SHARE THE RESULT"}
        </button>

        {/* Next cohort CTA — keep players in the funnel */}
        <div className="mt-4 bg-indigo/10 border border-indigo/40 rounded-2xl p-4 text-center">
          <p className="font-mono text-indigo text-xs tracking-widest uppercase mb-1">Next cohort</p>
          <p className="text-bone font-mono text-sm mb-3">
            {youWon ? "Defend your title. The next game starts soon." : "You've seen the game. Now play it. Reserve your slot for cohort 2."}
          </p>
          <a
            href={window.location.origin}
            className="inline-block w-full py-3 rounded-xl bg-indigo/20 border border-indigo/50 text-indigo font-display text-sm tracking-widest active:scale-95 transition-transform"
          >
            RESERVE FOR COHORT 2 →
          </a>
        </div>

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

  const mantra = missionMantra({
    theme: themeLabel,
    cap,
    checkedIn,
    eliminated,
    survived: Boolean(survived),
  });

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

      <div className="mb-4">
        <p className="font-mono text-amber text-[10px] tracking-[0.18em] uppercase mb-1">
          {mantra.kicker}
        </p>
        <p className="font-display text-xl text-bone leading-snug tracking-wide">
          {mantra.line}
        </p>
        {round?.prompt && (
          <p className="text-dim text-xs font-mono mt-2 leading-relaxed">{round.prompt}</p>
        )}
      </div>

      {/* Mid-day verdict moment: in the final hour, show a live banner */}
      {closingSoon && !eliminated && (
        <div className="mb-3 bg-amber/10 border border-amber/40 rounded-xl p-3 animate-pulse">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⚡</span>
            <p className="font-mono text-amber text-xs tracking-widest uppercase">Verdicts are landing</p>
          </div>
          <p className="text-dim text-[11px] font-mono leading-relaxed">
            Final hour — submissions are being verified and flagged in real-time. Watch the audit feed to see the crowd's verdicts come in.
          </p>
          <button
            onClick={onViewFeed}
            className="w-full mt-2 py-2 rounded-lg bg-amber/20 border border-amber/40 text-amber font-mono text-xs active:scale-95 transition-transform"
          >
            WATCH LIVE VERDICTS →
          </button>
        </div>
      )}

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
        <div className="bg-blood/10 border border-blood/30 rounded-xl p-4 mb-3 space-y-3">
          <div>
            <p className="font-display text-xl text-blood">Eliminated{you?.eliminatedAtDay ? ` · Day ${you.eliminatedAtDay}` : ""}</p>
            <p className="text-dim text-xs font-mono mt-1">
              You survived {you?.eliminatedAtDay ?? "—"} day{(you?.eliminatedAtDay ?? 0) !== 1 ? "s" : ""}. The game isn't over for you.
            </p>
          </div>

          {/* Survival summary stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
              <p className="text-dim text-[9px] font-mono uppercase">Days</p>
              <p className="text-bone font-display text-lg">{you?.eliminatedAtDay ?? "—"}</p>
            </div>
            <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
              <p className="text-dim text-[9px] font-mono uppercase">Streak</p>
              <p className="text-amber font-display text-lg">{you?.checkinStreak ?? 0}🔥</p>
            </div>
            <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
              <p className="text-dim text-[9px] font-mono uppercase">Top %</p>
              <p className="text-bone font-display text-lg">
                {you?.eliminatedAtDay ? Math.round((Number(you.eliminatedAtDay) * 100) / 5) : "—"}%
              </p>
            </div>
          </div>

          {/* Jury status card */}
          <div className={`rounded-xl p-3 border ${you?.isJury ? "bg-amber/10 border-amber/40" : "bg-ash/60 border-ember/40"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{you?.isJury ? "⚖️" : "🗳️"}</span>
              <p className={`font-mono text-xs uppercase tracking-widest ${you?.isJury ? "text-amber" : "text-dim"}`}>
                {you?.isJury ? "Jury member" : "Voting — earn jury status"}
              </p>
            </div>
            {you?.isJury ? (
              <p className="text-amber text-sm font-mono">
                Your votes count ×{you.juryWeight ?? 2}. Keep voting accurately to earn lottery tickets for the next cohort.
              </p>
            ) : (
              <p className="text-dim text-xs font-mono">
                Vote on {Math.max(0, 5 - (you?.votesResolved ?? 0))} more submission{Math.max(0, 5 - (you?.votesResolved ?? 0)) !== 1 ? "s" : ""} with ≥80% accuracy to become a juror. Jury votes count double.
              </p>
            )}
          </div>

          {/* Vote accuracy stats */}
          {(you?.votesResolved ?? 0) > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
                <p className="text-dim text-[9px] font-mono uppercase">Accuracy</p>
                <p className="text-bone font-display text-lg">
                  {you?.voteAccuracy != null ? `${Math.round(you.voteAccuracy * 100)}%` : "—"}
                </p>
              </div>
              <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
                <p className="text-dim text-[9px] font-mono uppercase">Correct</p>
                <p className="text-bone font-display text-lg">{you?.votesCorrect ?? 0}</p>
              </div>
              <div className="bg-ash/60 rounded-lg p-2 border border-ember/30">
                <p className="text-dim text-[9px] font-mono uppercase">Tickets</p>
                <p className="text-amber font-display text-lg">{you?.juryTickets ?? 0}</p>
              </div>
            </div>
          )}

          <p className="text-dim text-[11px] font-mono leading-relaxed">
            🎫 Jury tickets weight your next cohort's lottery draw. Every correct verdict vote earns +1 ticket. Catch an infiltrator → +2 tickets.
          </p>
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
                : "The crowd has spoken. You're on the jury now — your votes count double and earn lottery tickets for the next cohort."}
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
            {you?.checkinStreak >= 2 && (
              <p className="text-amber text-[11px] font-mono mt-1.5">
                🔥 {you.checkinStreak}-day streak · {you.checkinStreak >= 3 ? "+1 jury ticket bonus at day close" : "3-day streak earns a bonus ticket"}
              </p>
            )}
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
