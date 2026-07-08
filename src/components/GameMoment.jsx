import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * GameMoment — full-screen cinematic overlays for the two most
 * emotional beats in the game: SURVIVAL and ELIMINATION.
 *
 * Replaces the inline result cards in CheckIn.jsx with a
 * dimmed-background, large-type, haptic-driven moment that
 * feels like a reality-show reveal.
 *
 * Props:
 *   result    — { survived, rank, survivalCap, queued, gpsShared }
 *   currentDay — number
 *   onDismiss — callback when user taps "back to game"
 *   onShare   — callback for share button
 *   shareCopied — boolean (share feedback)
 *   photoUploadFailed — boolean
 */
export default function GameMoment({
  result,
  currentDay,
  onDismiss,
  onShare,
  shareCopied,
  photoUploadFailed,
}) {
  if (!result) return null;

  // Queued state — keep it simple, no cinematic
  if (result.queued) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-6"
      >
        <div className="w-28 h-28 rounded-full bg-amber/10 border-2 border-amber flex items-center justify-center">
          <span className="text-6xl">📡</span>
        </div>
        <div className="text-center">
          <p className="font-display text-4xl text-amber mb-1">QUEUED</p>
          <p className="text-bone font-mono text-sm">Check-in saved offline</p>
          <p className="text-dim font-mono text-xs mt-2">
            Submits automatically when you reconnect.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl font-display text-2xl tracking-widest active:scale-[0.97] transition-transform text-bone bg-smoke border border-ember"
        >
          BACK TO GAME
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {result.survived ? (
        <SurvivalMoment
          key="survival"
          result={result}
          currentDay={currentDay}
          onDismiss={onDismiss}
          onShare={onShare}
          shareCopied={shareCopied}
          photoUploadFailed={photoUploadFailed}
        />
      ) : (
        <EliminationMoment
          key="elimination"
          result={result}
          currentDay={currentDay}
          onDismiss={onDismiss}
          onShare={onShare}
          shareCopied={shareCopied}
        />
      )}
    </AnimatePresence>
  );
}

function SurvivalMoment({ result, currentDay, onDismiss, onShare, shareCopied, photoUploadFailed }) {
  // Haptic celebration
  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 40, 30, 40, 60]);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ash/95 backdrop-blur-md px-5"
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
        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        className="w-32 h-32 rounded-full bg-neon/15 border-2 border-neon flex items-center justify-center mb-8 relative z-10"
      >
        <span className="text-7xl">✅</span>
      </motion.div>

      {/* Result text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", duration: 0.5 }}
        className="text-center relative z-10"
      >
        <p className="font-mono text-neon text-sm tracking-widest uppercase mb-2">
          Day {currentDay ?? "—"} · Survived
        </p>
        <p className="font-display text-7xl text-bone leading-none mb-3 animate-glow">
          RANK #{result.rank}
        </p>
        <p className="text-dim font-mono text-base">
          of {result.survivalCap} surviving today
        </p>
        {result.gpsShared && (
          <p className="text-neon/70 font-mono text-xs mt-3">📍 GPS shared</p>
        )}
      </motion.div>

      {/* Photo warning */}
      {photoUploadFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm mt-6 rounded-xl border border-amber/40 bg-amber/10 p-3 relative z-10"
        >
          <p className="text-amber font-mono text-xs">
            Photo didn't upload — voters see this without a photo.
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm mt-8 space-y-3 relative z-10"
      >
        <button
          onClick={onShare}
          className="w-full py-3.5 rounded-2xl font-display text-lg tracking-widest active:scale-[0.97] transition-transform text-bone bg-indigo/20 border border-indigo/40"
        >
          {shareCopied ? "✓ COPIED" : "SHARE YOUR RANK 🧍"}
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl font-display text-2xl tracking-widest active:scale-[0.97] transition-transform text-bone bg-smoke border border-ember"
        >
          BACK TO GAME
        </button>
      </motion.div>
    </motion.div>
  );
}

function EliminationMoment({ result, currentDay, onDismiss, onShare, shareCopied }) {
  // Haptic thud — heavy, single pulse
  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
  }, []);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ash/95 backdrop-blur-md px-5"
    >
      {/* Red vignette */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 bg-blood"
        style={{ filter: "blur(60px)" }}
      />

      {/* Skull */}
      <motion.div
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8, bounce: 0 }}
        className="mb-6 relative z-10"
      >
        <span className="text-7xl">💀</span>
      </motion.div>

      {/* Eliminated text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", duration: 0.5 }}
        className="text-center relative z-10"
      >
        <p className="font-display text-6xl text-blood leading-none mb-3 animate-glow">
          ELIMINATED
        </p>
        <p className="text-bone font-mono text-base mb-1">
          You survived {daysSurvived} day{Number(daysSurvived) !== 1 ? "s" : ""}
        </p>
        <p className="text-dim font-mono text-sm">
          Rank #{result.rank} of {result.survivalCap} · Top {percentile}%
        </p>

        {/* Near-miss banner — the most powerful re-engagement trigger */}
        {nearMiss && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.3 }}
            className="mt-3 inline-block px-4 py-2 rounded-full bg-amber/15 border border-amber/50"
          >
            <p className="font-mono text-amber text-xs tracking-wide">
              So close — {spotsAway} {spotsAway === 1 ? "spot" : "spots"} from survival
            </p>
          </motion.div>
        )}
      </motion.div>

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
                  <span className="text-neon font-mono text-[10px]">{verdict.votes.realPct}%</span>
                </div>
              )}
              {verdict.votes.fakePct != null && verdict.votes.fakePct > 0 && (
                <div
                  className="bg-blood/40 flex items-center justify-center"
                  style={{ width: `${verdict.votes.fakePct}%` }}
                >
                  <span className="text-blood font-mono text-[10px]">{verdict.votes.fakePct}%</span>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-neon font-mono text-[10px]">🧍 HUMAN · {verdict.votes.real}</p>
              <p className="text-blood font-mono text-[10px]">SUS · {verdict.votes.fake}</p>
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
            ⚖️ You're the jury now
          </p>
          <p className="text-bone font-mono text-xs leading-relaxed mb-3">
            Your votes decide who survives. Get 80% accuracy on 5+ votes and your
            votes count <span className="text-amber">×2</span> — plus
            lottery tickets for next cohort.
          </p>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-amber/20 border border-amber/50 text-amber font-display text-sm tracking-widest active:scale-[0.97] transition-transform"
          >
            OPEN THE AUDIT FEED →
          </button>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="w-full max-w-sm mt-4 space-y-3 relative z-10"
      >
        {/* Near-miss CTA — channel the frustration into the next cohort */}
        {nearMiss && (
          <button
            onClick={onShare}
            className="w-full py-3.5 rounded-2xl font-display text-lg tracking-widest active:scale-[0.97] transition-transform text-amber bg-amber/10 border border-amber/40"
          >
            {shareCopied ? "✓ COPIED" : "🔥 CLAIM YOUR COMEBACK"}
          </button>
        )}
        <button
          onClick={onShare}
          className={`w-full py-3.5 rounded-2xl font-display text-lg tracking-widest active:scale-[0.97] transition-transform text-bone ${
            nearMiss ? "bg-smoke/60 border border-ember/40 text-sm" : "bg-indigo/20 border border-indigo/40"
          }`}
        >
          {shareCopied ? "✓ COPIED" : "SHARE YOUR RUN"}
        </button>
      </motion.div>
    </motion.div>
  );
}
