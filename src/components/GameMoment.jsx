import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { momentCardDataUrl } from "../lib/shareMoment.js";
import { HumanCta, GameCta, GhostLink } from "./ui/CraftCta.jsx";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import DozingCat from "./ui/DozingCat.jsx";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import ShareSheet from "./ShareSheet.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { useDelight } from "./DelightProvider.jsx";
import { getProfiledMascotLines } from "../lib/copy.js";
import { formatEliminationReason } from "../lib/eliminationReason.js";
import { haptic } from "../lib/haptics.js";
import { MOTION_DURATION, MOTION_EASE, MOTION_SPRING } from "../lib/motion.js";
import OverlayPortal from "./OverlayPortal.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

/**
 * GameMoment — full-screen cinematic overlays for the two most
 * emotional beats in the game: SURVIVAL and ELIMINATION.
 *
 * Replaces the inline result cards in CheckIn.jsx with a
 * dimmed-background, large-type, haptic-driven moment that
 * feels like a reality-show reveal. Shows a shareable moment
 * card preview so the myth is visible before the share sheet.
 *
 * Props:
 *   result    — { survived, rank, survivalCap, queued, gpsShared }
 *   currentDay — number
 *   onDismiss — callback when user taps "back to game"
 *   onShare   — callback for native share (mobile system sheet)
 *   shareCopied — boolean (share feedback)
 *   photoUploadFailed — boolean
 *   playerName — display name for the moment card
 *   shareText — composed caption for the share sheet
 *   shareUrl  — URL to include in the share
 *   photoUrl  — optional user photo for the share card background
 */
export default function GameMoment({
  result,
  currentDay,
  onDismiss,
  onShare,
  shareCopied,
  photoUploadFailed,
  playerName,
  shareText = "",
  shareUrl = "",
  photoUrl,
}) {
  const [showShareSheet, setShowShareSheet] = useState(false);

  if (!result) return null;

  // Queued state — keep it simple, no cinematic
  if (result.queued) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-5 pb-8 gap-6"
      >
        <div className="w-28 h-28 rounded-full bg-amber/10 border-2 border-amber flex items-center justify-center overflow-hidden">
          <ThemeMotif emoji="📡" size={72} label="queued" />
        </div>
        <div className="text-center">
          <p className="font-display text-4xl text-amber mb-1">Queued</p>
          <p className="text-bone font-body text-sm">Check-in saved offline</p>
          <p className="text-dim font-mono text-xs mt-2">
            Submits automatically when you reconnect.
          </p>
        </div>
        <GameCta tone="ghost" onClick={onDismiss}>
          Back to today's mission →
        </GameCta>
      </motion.div>
    );
  }

  return (
    <OverlayPortal>
      <AnimatePresence mode="wait">
        {result.survived ? (
          <SurvivalMoment
            key="survival"
            result={result}
            currentDay={currentDay}
            onDismiss={onDismiss}
            onShare={() => setShowShareSheet(true)}
            shareCopied={shareCopied}
            photoUploadFailed={photoUploadFailed}
            playerName={playerName}
            photoUrl={photoUrl}
            shareOpen={showShareSheet}
          />
        ) : (
          <EliminationMoment
            key="elimination"
            result={result}
            currentDay={currentDay}
            onDismiss={onDismiss}
            onShare={() => setShowShareSheet(true)}
            shareCopied={shareCopied}
            playerName={playerName}
            photoUrl={photoUrl}
            shareOpen={showShareSheet}
          />
        )}
      </AnimatePresence>
      <ShareSheet
        open={showShareSheet}
        kind={result.survived ? "survive" : "jury"}
        name={playerName}
        day={currentDay}
        rank={result.rank}
        cap={result.survivalCap}
        text={shareText}
        url={shareUrl}
        photoUrl={photoUrl}
        onNativeShare={onShare}
        onClose={() => setShowShareSheet(false)}
      />
    </OverlayPortal>
  );
}

function MomentCardPreview({ kind, name, day, rank, cap, photoUrl }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const host = typeof window !== "undefined" ? window.location.host : "lasthumanstanding.thisyearnofear.com";
        const data = await momentCardDataUrl(kind, { name, day, rank, cap, originHost: host, photoUrl });
        if (!cancelled) setSrc(data);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, name, day, rank, cap, photoUrl]);

  if (!src) return null;
  return (
    <motion.img
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      src={src}
      alt="Shareable moment card"
      className="w-full max-w-sm rounded-xl border border-amber/40 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] relative z-10"
    />
  );
}

function SurvivalMoment({ result, currentDay, onDismiss, onShare, shareCopied, photoUploadFailed, playerName, photoUrl, shareOpen }) {
  const { handleMascotClick } = useDelight();
  // Haptic celebration
  useEffect(() => {
    haptic("success");
  }, []);

  // Yield the trap to ShareSheet while it's stacked on top
  const trapRef = useFocusTrap(!shareOpen, { onEscape: onDismiss });
  const nextDay =
    currentDay != null && Number(currentDay) >= 1 && Number(currentDay) < 5
      ? Number(currentDay) + 1
      : null;
  const continueLabel = nextDay
    ? `Continue to Day ${nextDay} →`
    : currentDay != null
      ? "Continue to the finale →"
      : "Continue →";

  return (
    <motion.div
      ref={trapRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Day ${currentDay ?? ""} survived — rank ${result.rank}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ash/88 backdrop-blur-sm px-5 overflow-y-auto overscroll-y-contain py-8 outline-none"
    >
      {/* Pulse rings behind the checkmark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.5, opacity: 0.4 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          className="w-32 h-32 rounded-full border-2 border-neon"
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0.4 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
          className="absolute w-32 h-32 rounded-full border-2 border-neon"
        />
      </div>

      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...MOTION_SPRING.gentle, bounce: 0.3 }}
        className="w-24 h-24 rounded-full bg-neon/15 border-2 border-neon flex items-center justify-center mb-5 relative z-10 shrink-0 overflow-hidden"
      >
        <ThemeMotif emoji="🌅" size={64} label="survived" />
      </motion.div>

      {/* Result text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", duration: 0.5 }}
        className="text-center relative z-10 mb-4"
      >
        <p className="font-mono text-neon text-sm tracking-widest uppercase mb-2">
          Day {currentDay ?? "—"} · Survived
        </p>
        <p className="font-display text-6xl text-bone leading-none mb-2 animate-glow tabular-nums">
          RANK #{result.rank}
        </p>
        <p className="text-dim font-body text-sm tabular-nums">
          of {result.survivalCap} surviving today
        </p>
        {result.gpsShared && (
          <p className="text-neon/70 font-mono text-xs mt-2">GPS shared</p>
        )}
      </motion.div>

      {/* Survivor celebrates with you */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", bounce: 0.4 }}
        className="relative z-10 mb-2"
      >
        <MascotGuide
          variant="celebrating"
          size={48}
          message={getProfiledMascotLines().survived}
          position="top"
          interactive
          onMascotClick={handleMascotClick}
        />
      </motion.div>

      <MomentCardPreview
        kind="survive"
        name={playerName}
        day={currentDay}
        rank={result.rank}
        cap={result.survivalCap}
        photoUrl={photoUrl}
      />

      <div className="relative z-10 w-full max-w-sm mt-5">
        <MotifFrieze className="w-full opacity-85" />
      </div>

      {/* Photo warning */}
      {photoUploadFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm mt-4 rounded-xl border border-amber/40 bg-amber/10 p-3 relative z-10"
        >
          <p className="text-amber font-mono text-xs">
            Photo didn&apos;t upload — voters see this without a photo.
          </p>
        </motion.div>
      )}

      {/* Return ritual — next day is the primary exit; share stays optional */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm mt-6 space-y-3 relative z-10"
      >
        {nextDay && (
          <div className="rounded-2xl border border-neon/25 bg-neon/5 px-4 py-3 text-center">
            <p className="font-mono text-neon text-[10px] uppercase tracking-[0.18em] mb-1">
              Tomorrow&apos;s return
            </p>
            <p className="font-body text-bone/80 text-sm leading-snug">
              Day {nextDay} opens with a new theme. One photo. One chance.
            </p>
          </div>
        )}
        <HumanCta onClick={onDismiss}>{continueLabel}</HumanCta>
        <GhostLink onClick={onShare} className="w-full py-2">
          {shareCopied ? "Copied" : "Share your card"}
        </GhostLink>
      </motion.div>
    </motion.div>
  );
}

function EliminationMoment({ result, currentDay, onDismiss, onShare, shareCopied, playerName, photoUrl, shareOpen }) {
  const { handleMascotClick } = useDelight();
  // Haptic thud — heavy, single pulse
  useEffect(() => {
    haptic("error");
  }, []);

  // Yield the trap to ShareSheet while it's stacked on top
  const trapRef = useFocusTrap(!shareOpen, { onEscape: onDismiss });

  // Fetch the vote breakdown for this day's submission — "why was I eliminated"
  const [verdict, setVerdict] = useState(null);
  useEffect(() => {
    if (!currentDay) return;
    let cancelled = false;
    fetch(`/api/my-verdict/${currentDay}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (!cancelled) setVerdict(data?.verdict ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentDay]);

  const daysSurvived = currentDay ?? "—";
  const percentile = Math.round((Number(currentDay) || 1) * 100 / 5);
  const rank = Number(result.rank) || 0;
  const cap = Number(result.survivalCap) || 0;
  // Near-miss: were you within 3 spots of the survival cap?
  const nearMiss = rank > cap && rank <= cap + 3;
  // How close were you? (spots away from survival)
  const spotsAway = rank > cap ? rank - cap : 0;
  // Was the elimination due to being flagged (DQ'd) vs ranked out?
  const wasFlagged = verdict?.status === "flagged";
  const wasInfiltrator = verdict?.wasInfiltrator;
  const immediateReason = formatEliminationReason(
    !result.survived
      ? {
          code: rank > cap && cap > 0 ? "too_slow" : "ranked_out",
          day: currentDay,
          rank,
          cap,
          spotsAway: rank > cap && cap > 0 ? rank - cap : null,
        }
      : null,
  );

  return (
    <motion.div
      ref={trapRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Eliminated on day ${currentDay ?? ""} — rank ${result.rank}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ash/95 backdrop-blur-md px-5 overflow-y-auto overscroll-y-contain py-8 outline-none"
    >
      {/* Red vignette */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 bg-blood pointer-events-none"
        style={{ filter: "blur(60px)" }}
      />

      {/* Skull */}
      <motion.div
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8, bounce: 0 }}
        className="mb-4 relative z-10 shrink-0"
      >
        <DozingCat size={72} />
      </motion.div>

      {/* Eliminated text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", duration: 0.5 }}
        className="text-center relative z-10 mb-4"
      >
        <p className="font-display text-5xl text-blood leading-none mb-2 animate-glow">
          ELIMINATED
        </p>
        <p className="text-bone font-mono text-base mb-1 tabular-nums">
          You survived {daysSurvived} day{Number(daysSurvived) !== 1 ? "s" : ""}
        </p>
        <p className="text-dim font-mono text-sm tabular-nums">
          Rank #{result.rank} of {result.survivalCap} · Top {percentile}%
        </p>
        {immediateReason && (!verdict || verdict.votes?.total === 0) && (
          <p className="text-bone/70 text-sm font-body mt-3 max-w-xs mx-auto leading-relaxed">
            {immediateReason.body}
          </p>
        )}

        {/* Near-miss banner — the most powerful re-engagement trigger */}
        {nearMiss && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.3 }}
            className="mt-3 inline-block px-4 py-2 rounded-full bg-amber/15 border border-amber/50"
          >
            <p className="font-mono text-amber text-xs tracking-wide tabular-nums">
              So close — {spotsAway} {spotsAway === 1 ? "spot" : "spots"} from survival
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Survivor feels it with you */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: "spring", bounce: 0.3 }}
        className="relative z-10 mb-2"
      >
        <MascotGuide
          variant={nearMiss ? "determined" : "sad"}
          size={48}
          message={nearMiss ? getProfiledMascotLines().eliminatedNear : getProfiledMascotLines().eliminated}
          position="top"
          interactive
          onMascotClick={handleMascotClick}
        />
      </motion.div>

      <MomentCardPreview
        kind="jury"
        name={playerName}
        day={daysSurvived}
        rank={result.rank}
        cap={result.survivalCap}
        photoUrl={photoUrl}
      />

      <div className="relative z-10 w-full max-w-sm mt-5">
        <MotifFrieze className="w-full opacity-85" />
      </div>

      {/* Verdict breakdown — "why was I eliminated" closure */}
      {verdict && verdict.votes?.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: "spring", duration: 0.5 }}
          className="w-full max-w-sm mt-4 relative z-10"
        >
          <div className="bg-smoke/80 border border-ember/40 rounded-2xl p-4">
            <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-2 text-center">
              {wasFlagged ? "Your submission was flagged" : "The verdict on your photo"}
            </p>
            {wasInfiltrator && (
              <p className="text-purple-300 font-mono text-[10px] text-center mb-2">
                🕶️ Infiltrator attempt — {wasFlagged ? "caught" : "trusted"}
              </p>
            )}
            {/* Vote bar */}
            <div className="flex h-6 rounded-lg overflow-hidden border border-ember/30">
              {verdict.votes.realPct != null && verdict.votes.realPct > 0 && (
                <div
                  className="bg-neon/40 flex items-center justify-center"
                  style={{ width: `${verdict.votes.realPct}%` }}
                >
                  <span className="text-neon font-mono text-[10px] tabular-nums">{verdict.votes.realPct}%</span>
                </div>
              )}
              {verdict.votes.fakePct != null && verdict.votes.fakePct > 0 && (
                <div
                  className="bg-blood/40 flex items-center justify-center"
                  style={{ width: `${verdict.votes.fakePct}%` }}
                >
                  <span className="text-blood font-mono text-[10px] tabular-nums">{verdict.votes.fakePct}%</span>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-neon font-mono text-[10px] tabular-nums">🧍 HUMAN · {verdict.votes.real}</p>
              <p className="text-blood font-mono text-[10px] tabular-nums">SUS · {verdict.votes.fake}</p>
            </div>
            {wasFlagged && (
              <p className="text-dim text-[10px] font-mono mt-2 text-center leading-relaxed">
                The crowd voted SUS. {wasInfiltrator ? "Your bluff was called." : "Next time, try adding GPS or a landmark for credibility."}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Jury card — appears immediately, part of the moment */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, type: "spring", duration: 0.5, bounce: 0.2 }}
        className="w-full max-w-sm mt-6 relative z-10"
      >
        <div className="bg-amber/10 border border-amber/40 rounded-2xl p-4 text-center">
          <p className="font-mono text-amber text-sm uppercase tracking-widest mb-2">
            You&apos;re the jury now
          </p>
          <p className="text-bone font-body text-xs leading-relaxed mb-2">
            Your votes decide who survives. Get 80% accuracy on 5+ votes and your
            votes count <span className="text-amber">×2</span> — plus
            lottery tickets for next cohort.
          </p>
          {Number(currentDay) < 4 && (
            <p className="text-purple-300 font-body text-[11px] leading-relaxed mb-3 pt-2 border-t border-amber/20">
              Not over yet: on Day 4, the jury can revive one eliminated player. Keep voting to stay visible.
            </p>
          )}
          <HumanCta onClick={onDismiss} className="!py-3">
            Open the audit feed →
          </HumanCta>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="w-full max-w-sm mt-4 space-y-3 relative z-10"
      >
        {nearMiss && (
          <HumanCta onClick={onShare}>
            {shareCopied ? "Copied" : "Claim your comeback →"}
          </HumanCta>
        )}
        <GameCta tone="ghost" onClick={onShare} className="!text-sm">
          {shareCopied ? "Copied" : "Share your card →"}
        </GameCta>
      </motion.div>
    </motion.div>
  );
}
