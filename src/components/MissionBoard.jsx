import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRound } from "../world/RoundProvider.jsx";
import { useWorld } from "../world/WorldProvider.jsx";
import { useDelight } from "./DelightProvider.jsx";
import AgentReveal from "./AgentReveal.jsx";
import { useMascotEvent } from "../hooks/useMascotEvent.js";
import EliminationReasonCard from "./EliminationReasonCard.jsx";
import { resolveActiveTheme } from "../data/game";
import { missionMantra, getMissionMascot, getEndgameMascot } from "../lib/copy.js";
import { shareMoment, momentCardDataUrl } from "../lib/shareMoment.js";
import Countdown from "./Countdown.jsx";
import TrustBadge from "./TrustBadge.jsx";
import ThemeFairness from "./ThemeFairness.jsx";
import Cohort2Handoff from "./Cohort2Handoff.jsx";
import VoteProgressCard from "./VoteProgressCard.jsx";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import StreakBloom from "./ui/StreakBloom.jsx";
import DozingCat from "./ui/DozingCat.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { HumanCta, GameCta } from "./ui/CraftCta.jsx";
import { CUE_PRESS } from "../lib/cuelume.js";
import JuryOnboarding from "./JuryOnboarding.jsx";
import SpectatorPanel from "./SpectatorPanel.jsx";

function formatWindow(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

function EndedCeremony({ winner, you, payout, breakdown, currentDay, onViewFeed }) {
  const { handleMascotClick } = useDelight();
  const youWon = Boolean(
    winner?.address && you?.address && winner.address.toLowerCase() === you.address.toLowerCase(),
  );
  const winnerName = winner?.username
    ? `@${winner.username}`
    : winner?.address
      ? `${winner.address.slice(0, 6)}…${winner.address.slice(-4)}`
      : null;
  const winCardName = youWon
    ? (winner?.username ? `@${winner.username}` : "You")
    : (winnerName ?? "One human");
  const endMascot = getEndgameMascot({ youWon, eliminated: you?.isEliminated });

  const [winCardSrc, setWinCardSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const src = await momentCardDataUrl("win", {
          name: winCardName,
          day: currentDay ?? 5,
          originHost: window.location.host,
        });
        if (!cancelled) setWinCardSrc(src);
      } catch {
        if (!cancelled) setWinCardSrc(null);
      }
    })();
    return () => { cancelled = true; };
  }, [winCardName, currentDay]);

  const shareWin = async () => {
    const text = youWon
      ? `I am the LAST HUMAN STANDING. I outlasted the whole cohort.`
      : `${winCardName} just won Last Human Standing. Next cohort is coming — get in.`;
    const url = `${window.location.origin}/api/share/winner`;
    await shareMoment("win", {
      name: winCardName,
      day: currentDay ?? 5,
      text,
      url,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-5 mb-4 bg-smoke border border-amber/40 rounded-3xl p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.7, bounce: 0.35 }}
        className="mb-4"
      >
        <MotifFrieze className="w-full" />
      </motion.div>

      <div className="flex justify-center mb-4">
        <MascotGuide
          variant={endMascot.variant}
          size={64}
          message={endMascot.message}
          position="top"
          interactive
          onMascotClick={handleMascotClick}
        />
      </div>

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
          <div className="mt-4 grid grid-cols-3 gap-2 bg-ash/60 rounded-xl p-3">
            <div>
              <p className="font-display text-2xl text-amber">{currentDay ?? 5}</p>
              <p className="text-dim text-[9px] font-mono uppercase">Days</p>
            </div>
            <div>
              <p className="font-display text-2xl text-amber">{you?.checkinStreak ?? 0}</p>
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
          {you?.isAuthed && (
            <div className="mt-4 grid grid-cols-3 gap-2 bg-ash/60 rounded-xl p-3">
              <div>
                <p className="font-display text-2xl text-bone">{you?.eliminatedAtDay ?? currentDay ?? "—"}</p>
                <p className="text-dim text-[9px] font-mono uppercase">Days</p>
              </div>
              <div>
                <p className="font-display text-2xl text-bone">{you?.checkinStreak ?? 0}</p>
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

      {winCardSrc && (
        <img
          src={winCardSrc}
          alt="Winner moment card"
          className="w-full mt-4 rounded-xl border border-ember/50"
        />
      )}

      {payout && (
        <div className="mt-4 bg-ash/60 border border-ember/30 rounded-xl p-3 text-left">
          <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-1">Prize payout</p>
          {payout.status === "submitted" || payout.status === "confirmed" ? (
            <>
              <p className="text-neon font-mono text-sm">
                {payout.amount_usd} {payout.token} sent onchain
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

      {breakdown && <AgentReveal />}

      <HumanCta onClick={shareWin} className="mt-4">
        {youWon ? "Share your victory card →" : "Share the result →"}
      </HumanCta>

      <Cohort2Handoff youWon={youWon} />

      <GameCta tone="ghost" onClick={onViewFeed} className="mt-2 !text-sm">
        Relive the final audit →
      </GameCta>
    </motion.div>
  );
}

export default function MissionBoard({ onCheckIn, onViewFeed, user }) {
  const { phase, isLive, isEnded, currentDay, round, you, winner, payout, breakdown } = useRound();
  const { handleMascotClick } = useDelight();
  const { mascotEvent } = useMascotEvent();

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
  const canAudit = isLive && Boolean(user?.paid);
  const themeData = resolveActiveTheme(round);
  const themeLabel = themeData.theme;
  const opens = formatWindow(round?.opensAt);
  const closes = formatWindow(round?.closesAt);
  const slotsLeft = round?.slotsRemaining ?? null;
  const cap = round?.survivalCap ?? 25;

  const checkedIn = Boolean(you?.checkedInToday);
  const survived = you?.survivedToday;
  const rank = you?.rankToday;
  const eliminated = Boolean(you?.isEliminated);

  const prelaunchMascot = { variant: mascotEvent?.variant || "thinking", message: mascotEvent?.message };

  if (phase === "prelaunch") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mb-4 bg-smoke border border-amber/30 rounded-3xl p-5"
      >
        <div className="flex flex-col items-center mb-4">
          <MascotGuide
            variant={prelaunchMascot.variant}
            size={64}
            message={prelaunchMascot.message}
            position="top"
            interactive
            onMascotClick={handleMascotClick}
          />
        </div>
        <p className="font-mono text-amber text-xs tracking-widest uppercase mb-2 text-center">Pre-game</p>
        <p className="font-display text-2xl text-bone mb-2 text-center">You're registered</p>
        <p className="text-dim text-sm font-mono leading-relaxed text-center">
          When the game starts, you will get a daily theme, a check-in window, and a race for the first {cap} spots.
        </p>
        <div className="mt-3 flex justify-center">
          <TrustBadge size="md" />
        </div>
      </motion.div>
    );
  }

  if (isEnded) {
    return (
      <EndedCeremony
        winner={winner}
        you={you}
        payout={payout}
        breakdown={breakdown}
        currentDay={currentDay}
        onViewFeed={onViewFeed}
      />
    );
  }

  if (!isLive) return null;

  const missionState = eliminated
    ? "eliminated"
    : survived
      ? "survived"
      : checkedIn
        ? "checkedIn"
        : isSpectator
          ? "spectator"
          : "open";
  // Use the central mascot event from MascotEventProvider, falling back
  // to the local derivation only if the provider isn't ready yet.
  const missionMascot = mascotEvent
    ? { variant: mascotEvent.variant, message: mascotEvent.message }
    : getMissionMascot({ state: missionState, cap, theme: themeLabel });
  const juryTickets = you?.juryTickets ?? 0;

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
      <div className="absolute -right-3 -top-3 opacity-25 pointer-events-none" aria-hidden>
        <ThemeMotif emoji={themeData.emoji} size={96} label={themeLabel} />
      </div>

      <div className="flex items-start justify-between gap-2 mb-3 relative">
        <MascotGuide
          variant={missionMascot.variant}
          size={56}
          message={missionMascot.message}
          position="top"
          interactive
          onMascotClick={handleMascotClick}
          showBadge
          badgeCount={juryTickets}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0 pt-1">
          <p className="font-mono text-neon text-xs tracking-widest uppercase">Today&apos;s mission · Day {currentDay ?? "—"}</p>
          <div className="flex items-center gap-3 mt-1">
            <ThemeMotif emoji={themeData.emoji} size={40} label={themeLabel} />
            <p className="font-display text-2xl text-bone leading-tight">{themeLabel}</p>
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
        <ThemeFairness theme={themeData} className="mt-3" />
      </div>

      {/* Mid-day verdict moment: in the final hour, show a live banner */}
      {closingSoon && !eliminated && (
        <div className="mb-3 bg-amber/10 border border-amber/40 rounded-xl p-3 animate-pulse">
          <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Verdicts are landing</p>
          <p className="text-dim text-[11px] font-body leading-relaxed">
            Final hour — submissions are being verified and flagged in real time. Watch the audit feed to see the crowd&apos;s verdicts come in.
          </p>
          <button
            type="button"
            onClick={onViewFeed}
            {...CUE_PRESS}
            className="w-full mt-2 py-2 rounded-lg bg-amber/20 border border-amber/40 text-amber font-mono text-xs active:scale-95 transition-transform"
          >
            Watch live verdicts →
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
              {closingSoon ? 'Closes ' : 'Closes '}
              <Countdown targetIso={round.closesAt} className="inline font-mono" />
            </p>
          )}
        </div>
        <div className="bg-ash rounded-xl p-3 border border-ember">
          <p className="text-dim text-[10px] font-mono uppercase">Spots left</p>
          <p className="text-bone font-display text-2xl mt-0.5 tabular-nums">
            {slotsLeft != null ? slotsLeft : "—"}
            <span className="text-dim text-sm font-mono"> / {cap}</span>
          </p>
        </div>
      </div>

      {canAudit && <VoteProgressCard onViewFeed={onViewFeed} />}

      {eliminated ? (
        <div className="space-y-3">
          {you?.eliminationReason && (
            <EliminationReasonCard reason={you.eliminationReason} />
          )}
          <JuryOnboarding user={you} onViewFeed={onViewFeed} />
        </div>
      ) : checkedIn ? (
        round?.status === "closed" ? (
          <div className="space-y-3 mb-3">
            <div className={`${survived ? "bg-neon/10 border-neon/30" : "bg-blood/10 border-blood/30"} border rounded-xl p-3`}>
              <p className={`font-display text-xl ${survived ? "text-neon" : "text-blood"}`}>
                {survived ? "Verdict is in — you made the cut" : "Verdict is in — you're out"}
              </p>
              <p className="text-dim text-xs font-mono mt-1">
                {survived
                  ? `Day ${currentDay ?? "—"} closed at rank #${rank ?? "—"}.`
                  : "The crowd has spoken. You're on the jury now — your votes earn lottery tickets for the next cohort."}
              </p>
            </div>
            {survived && Number(currentDay) < 5 && (
              <div className="rounded-xl border border-neon/25 bg-neon/5 px-3 py-3 text-center">
                <p className="font-mono text-neon text-[10px] uppercase tracking-[0.18em] mb-1">
                  Tomorrow&apos;s return
                </p>
                <p className="font-body text-bone/75 text-xs leading-snug">
                  Day {Number(currentDay) + 1} opens with a new theme. One photo. One chance.
                </p>
              </div>
            )}
            <HumanCta onClick={onViewFeed}>
              {survived
                ? Number(currentDay) < 5
                  ? `Hold for Day ${Number(currentDay) + 1} · watch the field →`
                  : "Watch the field →"
                : "Enter the audit as jury →"}
            </HumanCta>
          </div>
        ) : (
          <div className="space-y-3 mb-3">
            <div className="bg-neon/10 border border-neon/30 rounded-xl p-3">
              <p className="font-display text-xl text-neon">
                {survived ? `Surviving · Rank #${rank ?? "—"}` : `Checked in · Rank #${rank ?? "—"}`}
              </p>
              <p className="text-dim text-xs font-mono mt-1">
                {survived
                  ? "Hold your spot — the audit verdict lands when the window closes. Flagged players get replaced."
                  : "At risk until day closes — if the audit disqualifies a survivor, you inherit their slot."}
              </p>
              {you?.checkinStreak >= 2 && (
                <div className="mt-2 flex items-center gap-2">
                  <StreakBloom streak={you.checkinStreak} size={28} />
                  <p className="text-amber text-[11px] font-body leading-snug">
                    {you.checkinStreak}-day streak ·{" "}
                    {you.checkinStreak >= 5
                      ? "+3 jury ticket bonus at day close"
                      : you.checkinStreak >= 3
                        ? "+1 jury ticket bonus at day close"
                        : "3-day streak earns +1 · 5-day earns +3"}
                  </p>
                </div>
              )}
            </div>
            <HumanCta onClick={onViewFeed}>
              Enter the audit →
            </HumanCta>
          </div>
        )
      ) : isSpectator ? (
        <SpectatorPanel onViewFeed={onViewFeed} />
      ) : (
        <HumanCta onClick={onCheckIn} className="mb-3 animate-pulse-blood">
          Check in now →
        </HumanCta>
      )}

      {!isSpectator && !checkedIn && (
        <GameCta tone="ghost" onClick={onViewFeed} className="!text-sm">
          Open audit feed → vote HUMAN or SUS
        </GameCta>
      )}
    </motion.div>
  );
}
