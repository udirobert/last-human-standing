import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { resolveActiveTheme } from '../data/game';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import FAQModal from './FAQModal.jsx';
import AppShell from './AppShell.jsx';
import { StageSection } from './StageShell.jsx';
import GlitchTitle from './ui/GlitchTitle.jsx';
import BubbleLoader from './ui/BubbleLoader.jsx';
import ThemeMotif from './ui/ThemeMotif.jsx';
import ThemeFairness from './ThemeFairness.jsx';
import GameMoment from './GameMoment.jsx';
import MascotGuide from './ui/MascotGuide.jsx';
import { useDelight } from './DelightProvider.jsx';
import { useMascotEvent } from '../hooks/useMascotEvent.js';
import { shareMoment } from '../lib/shareMoment.js';
import { getCheckInMascot, FAQ_PUBLIC_PHOTO_INDEX } from '../lib/copy.js';
import { ritualFeel } from '../lib/ritualFeel.js';
import { CompactButton, HumanCta, GameCta } from './ui/CraftCta.jsx';
import CheckInPreview from './CheckInPreview.jsx';
import { hashPhotoFile } from '../lib/photoHash.js';
import { CUE_PRESS } from '../lib/cuelume.js';

export default function CheckIn({ onBack, onSubmit }) {
  const { round, currentDay, phase, refresh: refreshRound } = useRound();
  const { isFarcaster, farcasterUser, signCheckIn, user } = useWorld();
  const { unlockAchievement, checkAchievement, playSound, handleMascotClick, recordSurvival } = useDelight();
  const { dispatchMascotEvent } = useMascotEvent();
  const [infiltratorStats, setInfiltratorStats] = useState(null);
  const [step, setStep] = useState(0); // 0=theme, 1=submitting, 2=done
  const [pos, setPos] = useState(null); // { lat, lng, accuracy }
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [photoUploadFailed, setPhotoUploadFailed] = useState(false);
  const [infiltratorMode, setInfiltratorMode] = useState(false);
  const [ritualMode, setRitualMode] = useState(false);
  // Day 1 is honest-only — establishes a baseline so infiltrator attempts
  // on Day 2+ are actually detectable. Also protects new players from
  // instant DQ on their first check-in.
  const infiltratorUnlocked = (currentDay ?? 1) >= 2;
  const checkInMascot = getCheckInMascot({ step, photoPreview, gpsEnabled });
  const [queuedCheckin, setQueuedCheckin] = useState(false);
  const { online, queueCheckin } = useOnlineStatus();
  const { markQueuedCheckin, clearQueuedCheckin } = useWorld();
  const fileRef = useRef();
  const watchRef = useRef(null);
  const sharedRef = useRef(false);

  const themeData = resolveActiveTheme(round);
  const theme = themeData.theme;

  // GPS toggle — start/stop watching
  const toggleGps = () => {
    if (gpsEnabled) {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setPos(null);
      setGpsEnabled(false);
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    setGpsLoading(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setGpsLoading(false);
        setGpsEnabled(true);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    setGpsEnabled(true);
  };

  useEffect(() => {
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  // Fetch infiltrator success rate for the path choice
  useEffect(() => {
    let cancelled = false;
    fetch("/api/infiltrator-stats", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (!cancelled) setInfiltratorStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // One share path for every surface: Farcaster gets composeCast, World App
  // and mobile browsers get the native share sheet, desktop gets clipboard.
  const [shareCopied, setShareCopied] = useState(false);

  const buildShare = (survived) => {
    const cap = result?.survivalCap ?? '?';
    const rank = result?.rank ?? '?';
    const displayName = user?.username
      ? `@${user.username}`
      : (user?.displayName || user?.address?.slice(0, 8) || 'anon');
    const strip = survived
      ? `Day ${currentDay} · Rank #${rank}/${cap} · SURVIVED`
      : `Survived ${currentDay ?? "?"} day${Number(currentDay) !== 1 ? "s" : ""} in Last Human Standing. The jury needs me now.`;
    const text = survived
      ? `${strip}\nLast Human Standing — one verified human takes the pot. Can you outlast me?`
      : `${strip}\nI'm out. But my votes count double now. Next cohort, I go all the way.`;
    const url = result?.checkinId
      ? `${window.location.origin}/api/share/checkin/${result.checkinId}`
      : window.location.origin;
    return { text, url, displayName, rank, cap };
  };

  const shareResult = async (survived) => {
    const { text, url, displayName, rank, cap } = buildShare(survived);
    const status = await shareMoment(survived ? "survive" : "jury", {
      name: displayName,
      day: currentDay,
      rank,
      cap,
      text,
      url,
      photoUrl: photoPreview,
      isFarcaster,
    });
    if (status === "copied") {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  // Auto-share on Farcaster after a successful check-in. Delayed 4s so
  // the composer doesn't pop over the user's "Back to game" tap.
  useEffect(() => {
    if (!isFarcaster || step !== 2 || !result?.survived || sharedRef.current) return;
    sharedRef.current = true;
    const timer = setTimeout(() => { shareResult(true); }, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFarcaster, step, result, currentDay]);

  const canSubmit = photoFile != null; // photo is the primary proof

  const handlePhotoSelect = () => {
    setRitualMode(true);
    // Small delay so the morph animation is visible before file picker opens
    setTimeout(() => fileRef.current?.click(), 400);
  };

  const handlePhotoCapture = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setRitualMode(false);
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    // Ritual completes when photo lands — brief hold so morph is visible
    setTimeout(() => setRitualMode(false), 600);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // If offline, queue the check-in via the service worker
    if (!online) {
      setQueuedCheckin(true);
      ritualFeel('seal');
      setStep(2);
      setResult({ queued: true });
      try {
        await queueCheckin({ lat: pos?.lat, lng: pos?.lng, accuracy: pos?.accuracy });
      } catch {
        // SW queue best-effort
      }
      // Surface the queued state globally so home shows the chip.
      markQueuedCheckin();
      return;
    }

    setStep(1);
    setSubmitError(null);
    dispatchMascotEvent({ type: "submitting", variant: "determined", message: getCheckInMascot({ step: 1 }).message });

    // Upload photo
    let mediaPath = null;
    let photoHash = null;
    if (photoFile) {
      try {
        photoHash = await hashPhotoFile(photoFile);
      } catch {
        photoHash = null;
      }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (photoFile && supabaseUrl && supabaseAnon) {
      try {
        const resp = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fileName: photoFile.name, contentType: photoFile.type }),
        });
        const json = await resp.json();
        if (resp.ok) {
          const supabase = createClient(supabaseUrl, supabaseAnon);
          const { error: upErr } = await supabase.storage
            .from(json.bucket)
            .uploadToSignedUrl(json.path, json.token, photoFile);
          if (!upErr) mediaPath = json.path;
          else setPhotoUploadFailed(true);
        } else {
          setPhotoUploadFailed(true);
        }
      } catch (e) {
        console.warn('photo upload failed', e);
        setPhotoUploadFailed(true);
      }
    }

    // Sign + record check-in
    try {
      await signCheckIn({
        message: [
          'Last Human Standing — Check-in',
          `day=${currentDay}`,
          `theme=${theme}`,
          pos ? `lat=${pos.lat}` : '',
          pos ? `lng=${pos.lng}` : '',
          `ts=${new Date().toISOString()}`,
          infiltratorMode ? 'infiltrator=true' : '',
        ].filter(Boolean).join('\n'),
        day: currentDay ?? 0,
        theme,
        caption,
        mediaPath,
        photoHash,
        isInfiltrator: infiltratorMode,
      });
    } catch {
      // signature is bonus
    }

    // The actual survival call — GPS is optional metadata
    try {
      const body = {};
      if (pos) { body.lat = pos.lat; body.lng = pos.lng; body.accuracy = pos.accuracy; }
      const resp = await fetch('/api/checkin/location', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setSubmitError(json?.error || 'check-in failed');
        setStep(0);
        return;
      }
      setResult(json);
      refreshRound();
      if (json.survived) {
        ritualFeel('survive');
        recordSurvival?.(json.roundId ?? json.checkinId ?? currentDay);
      } else {
        ritualFeel('eliminate');
      }

      // Achievement unlocks
      unlockAchievement?.('first_checkin');
      if (json.survived) {
        checkAchievement?.(currentDay >= 3, 'checkin_streak_3');
        checkAchievement?.(currentDay >= 7, 'checkin_streak_7');
      }

      // Clear any previously-queued chip on successful live submit.
      clearQueuedCheckin();
      setStep(2);
      // Clear the "submitting" durable override so the durable state
      // (survived / awaiting_audit) can take over once round refreshes,
      // then fire a transient reaction for the immediate verdict.
      dispatchMascotEvent(null);
      dispatchMascotEvent({
        type: json.survived ? "achievement" : "vote_react",
        variant: json.survived ? "celebrating" : "sad",
        message: json.survived ? getCheckInMascot({ step: 2 }).message : null,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'check-in failed');
      setStep(0);
      dispatchMascotEvent(null);
    }
  };

  return (
    <AppShell
      phase={phase === "live" ? "live" : phase === "ended" ? "ended" : "prelaunch"}
      flourishes={false}
    >
      
      {/* Infiltrator threat visual overlay */}
      <AnimatePresence>
        {infiltratorMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-t from-purple-900/50 via-transparent to-purple-900/50 ring-8 ring-purple-500/20 ring-inset animate-pulse"
          />
        )}
      </AnimatePresence>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Header */}
      <div className="relative z-10 px-5 pt-10 pb-6 flex items-center gap-3">
        <CompactButton
          onClick={onBack}
          className="h-10 px-3 rounded-xl bg-smoke/70 border border-ember/40 flex items-center gap-1.5 hover:border-amber/60 shrink-0"
          aria-label="Back to Survive"
        >
          <span className="text-dim text-lg leading-none">←</span>
          <span className="font-mono text-[10px] tracking-wider uppercase text-dim">Survive</span>
        </CompactButton>
        <div className="flex-1 min-w-0">
          <GlitchTitle text="CHECK IN" className="font-display text-3xl text-bone tracking-wide" />
          <p className="font-mono text-dim text-xs">Day {currentDay ?? '—'} · {theme || 'No round set'}</p>
        </div>
        <FAQModal />
      </div>

      {!round ? (
        phase === "prelaunch" ? (
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 pb-8">
            <CheckInPreview />
          </div>
        ) : (
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-5 gap-3">
            <p className="text-5xl">⏳</p>
            <p className="text-dim font-mono text-sm text-center">No round set for today yet.</p>
          </div>
        )
      ) : (
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 pb-8"
            >
              <div className="flex justify-center mb-3">
                <MascotGuide
                  variant={checkInMascot.variant}
                  size={56}
                  message={checkInMascot.message}
                  position="top"
                  interactive
                  onMascotClick={handleMascotClick}
                />
              </div>
              <div className="bg-smoke border border-neon/20 rounded-3xl p-6 mb-5 relative overflow-hidden">
                <div className="absolute -right-3 -top-3 opacity-25 pointer-events-none" aria-hidden>
                  <ThemeMotif emoji={themeData.emoji} size={88} label={theme} />
                </div>
                <p className="font-mono text-neon text-xs tracking-widest uppercase mb-1 relative">Today&apos;s mission</p>
                <div className="flex items-center gap-3 mb-2 relative">
                  <ThemeMotif emoji={themeData.emoji} size={64} label={theme} className="-my-2 shrink-0" />
                  <p className="font-display text-2xl text-bone">{theme}</p>
                </div>
                <p className="text-dim text-sm font-body relative">{themeData.description}</p>
                {round.prompt && <p className="text-dim text-xs font-mono mt-2 relative">{round.prompt}</p>}
                <ThemeFairness theme={themeData} className="mt-3 relative" />
                <div className="mt-3 flex justify-between text-xs font-mono text-dim relative">
                  <span className="tabular-nums">Slots: {round.slotsRemaining}/{round.survivalCap}</span>
                  <span>Anywhere on Earth</span>
                </div>
              </div>

              {/* Photo capture — primary proof */}
              {photoPreview ? (
                <div className="mb-5 rounded-3xl overflow-hidden border border-neon/30 relative shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)]" style={{ height: 200 }}>
                  <img src={photoPreview} alt="check-in" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    {...CUE_PRESS}
                    className="absolute top-2 right-2 bg-ash/80 backdrop-blur rounded-full px-3 py-1.5 text-bone text-xs font-mono"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <motion.div
                  layout
                  transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
                  className="mb-5 relative"
                >
                  <button
                    type="button"
                    onClick={handlePhotoSelect}
                    {...CUE_PRESS}
                    className="w-full bg-smoke/50 border border-dashed border-amber/35 rounded-3xl py-8 flex flex-col items-center justify-center gap-3 active:scale-[0.99] transition-transform"
                  >
                    <motion.div
                      animate={ritualMode ? { scale: 1.5, opacity: 0.3 } : { scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <ThemeMotif emoji={themeData.emoji} size={64} label={theme} />
                    </motion.div>
                    <motion.span
                      animate={ritualMode ? { opacity: 0 } : { opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-bone font-body text-sm"
                    >
                      Snap your proof of presence
                    </motion.span>
                    <motion.span
                      animate={ritualMode ? { opacity: 0 } : { opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-dim font-mono text-[10px] uppercase tracking-wider"
                    >
                      The crowd will vote on it
                    </motion.span>
                  </button>
                  {ritualMode && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="text-center">
                        <div className="text-neon font-mono text-sm uppercase tracking-widest">
                          capturing your moment
                        </div>
                        <div className="text-dim font-mono text-xs mt-1">
                          {theme}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Caption */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                maxLength={140}
                className="mb-4 w-full bg-smoke border border-ember rounded-xl px-4 py-3 text-bone font-mono text-sm placeholder:text-dim focus:outline-none focus:border-neon/40"
              />

              {/* GPS toggle — optional credibility boost */}
              <CompactButton
                onClick={toggleGps}
                className={`w-full mb-4 py-3 rounded-2xl font-mono text-sm tracking-wide border flex items-center justify-center gap-2 ${
                  gpsEnabled
                    ? 'bg-neon/10 border-neon/40 text-neon'
                    : 'bg-smoke border-ember text-dim'
                }`}
              >
                {gpsLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-amber border-t-transparent animate-spin" />
                    Getting location…
                  </>
                ) : gpsEnabled && pos ? (
                  <>📍 Location shared · ±{Math.round(pos.accuracy ?? 0)}m — bonus credibility</>
                ) : (
                  <>📍 Share location (optional · adds credibility for voters)</>
                )}
              </CompactButton>

              {submitError && (
                <div className="bg-blood/10 border border-blood/30 rounded-xl p-3 mb-3">
                  <p className="text-blood text-xs font-mono">{submitError}</p>
                </div>
              )}

              {/* CHOOSE YOUR PATH — infiltrator mode is now a first-class
                  choice, not a buried toggle. Two cards side by side.
                  Day 1 is honest-only to establish a baseline. */}
              <div className="mb-3">
                {infiltratorUnlocked ? (
                  <>
                    <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-2 text-center">
                      Choose your path
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Honest */}
                      <CompactButton
                        onClick={() => setInfiltratorMode(false)}
                        className={`py-3 px-2 rounded-xl border ${
                          !infiltratorMode
                            ? 'bg-neon/10 border-neon/50 text-neon'
                            : 'bg-smoke border-ember text-dim'
                        }`}
                      >
                        <p className="font-mono text-xs font-bold tracking-wide">HONEST</p>
                        <p className="text-[9px] font-mono mt-0.5 opacity-70">Play it straight</p>
                      </CompactButton>
                      <CompactButton
                        onClick={() => setInfiltratorMode(true)}
                        className={`py-3 px-2 rounded-xl border ${
                          infiltratorMode
                            ? 'bg-blood/20 border-blood/60 text-blood'
                            : 'bg-smoke border-ember text-dim'
                        }`}
                      >
                        <p className="font-mono text-xs font-bold tracking-wide">INFILTRATOR</p>
                        <p className="text-[9px] font-mono mt-0.5 opacity-70">Risk it all</p>
                      </CompactButton>
                    </div>
                  </>
                ) : (
                  <div className="bg-smoke border border-neon/20 rounded-xl p-3 text-center">
                    <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-1">
                      Day 1 · Honest check-in
                    </p>
                    <p className="text-dim text-[10px] font-mono leading-relaxed">
                      Infiltrator mode unlocks on Day 2. Today, just play it straight — establish your baseline.
                    </p>
                  </div>
                )}
              </div>

              {infiltratorMode && (
                <div className="bg-blood/10 border border-blood/30 rounded-xl p-3 mb-3 space-y-2">
                  <p className="text-bone/80 text-xs font-mono leading-relaxed">
                    Submit a photo that could go either way. The crowd votes.
                  </p>
                  <div className="space-y-1">
                    <p className="text-neon text-[11px] font-mono">
                      Trusted → immunity + 1 jury ticket
                    </p>
                    <p className="text-blood text-[11px] font-mono">
                      Flagged → DQ&apos;d, immunity burned
                    </p>
                  </div>

                  {infiltratorStats?.successRate != null && (
                    <p className="text-amber text-[10px] font-mono leading-relaxed pt-1 border-t border-blood/20 tabular-nums">
                      {infiltratorStats.successRate}% of infiltrators succeeded ({infiltratorStats.succeeded}/{infiltratorStats.total} attempts)
                    </p>
                  )}

                  <div className="pt-1 border-t border-blood/20 space-y-1">
                    <p className="text-dim text-[9px] font-mono uppercase tracking-widest mb-1">Strategy</p>
                    <p className="text-neon/70 text-[10px] font-mono leading-relaxed">
                      A real café photo from a different angle — looks staged but is genuine
                    </p>
                    <p className="text-blood/70 text-[10px] font-mono leading-relaxed">
                      An obvious stock photo — voters spot it instantly
                    </p>
                  </div>

                  <p className="text-amber text-[10px] font-mono leading-relaxed pt-1 border-t border-blood/20">
                    Voters who catch you get +2 tickets. Expect scrutiny.
                  </p>
                </div>
              )}

              {!online && canSubmit && (
                <div className="bg-amber/10 border border-amber/30 rounded-xl p-3 mb-3 flex items-center gap-2">
                  <ThemeMotif emoji="📡" size={32} label="offline" className="shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber text-xs font-mono">You are offline</p>
                    <p className="text-dim text-[10px] font-mono">Check-in will be queued and submitted when you reconnect.</p>
                  </div>
                </div>
              )}

              <p className="text-dim font-mono text-[10px] leading-relaxed text-center mb-3 px-1">
                Submitting posts this photo to the day&apos;s audit. Visible to the cohort (and spectators). GPS stays off unless you share it.{" "}
                <FAQModal
                  expandOnOpen={FAQ_PUBLIC_PHOTO_INDEX}
                  trigger={
                    <span className="text-amber/90 underline decoration-dotted underline-offset-2 hover:text-amber">
                      What’s public?
                    </span>
                  }
                />
              </p>

              {infiltratorMode && canSubmit ? (
                <GameCta tone="blood" onClick={handleSubmit} className="animate-pulse-blood">
                  Submit as infiltrator →
                </GameCta>
              ) : (
                <HumanCta onClick={handleSubmit} disabled={!canSubmit} className={canSubmit ? "animate-pulse-blood" : ""}>
                  {!online && canSubmit ? "Queue offline →" : !canSubmit ? "Take a photo first" : "Submit check-in →"}
                </HumanCta>
              )}
              {!canSubmit && (
                <p className="text-dim text-xs font-mono text-center mt-2">
                  Photo is required — the community votes on your proof
                </p>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-5 pb-8 gap-6"
            >
              <MascotGuide
                variant={checkInMascot.variant}
                size={72}
                message={checkInMascot.message}
                position="top"
                interactive
                onMascotClick={handleMascotClick}
              />
              {/* Your bubble — seeded from your identity, so it's always yours. */}
              <BubbleLoader size={112} seed={user?.username || user?.address} />
              <div className="text-center">
                <p className="font-display text-3xl text-bone">Sending…</p>
                <p className="text-dim font-body text-sm mt-1">Recording your check-in</p>
              </div>
            </motion.div>
          )}

          {step === 2 && result && (
            <GameMoment
              result={result}
              currentDay={currentDay}
              onDismiss={() => { onSubmit && onSubmit(); onBack(); }}
              onShare={() => shareResult(result.survived)}
              shareCopied={shareCopied}
              photoUploadFailed={photoUploadFailed}
              playerName={
                user?.username
                  ? `@${user.username}`
                  : (user?.displayName || user?.address?.slice(0, 8) || "anon")
              }
              shareText={buildShare(result.survived).text}
              shareUrl={buildShare(result.survived).url}
              photoUrl={photoPreview}
            />
          )}
        </AnimatePresence>
      )}
    </AppShell>
  );
}
