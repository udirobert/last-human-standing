import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { DAILY_THEMES, TODAY_THEME } from '../data/game';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export default function CheckIn({ onBack, onSubmit }) {
  const { round, currentDay, refresh: refreshRound } = useRound();
  const { isFarcaster, farcasterUser, signCheckIn } = useWorld();
  const [step, setStep] = useState(0); // 0=theme, 1=submitting, 2=done
  const [pos, setPos] = useState(null); // { lat, lng, accuracy }
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [infiltratorMode, setInfiltratorMode] = useState(false);
  const [queuedCheckin, setQueuedCheckin] = useState(false);
  const { online, queueCheckin } = useOnlineStatus();
  const fileRef = useRef();
  const watchRef = useRef(null);
  const sharedRef = useRef(false);

  const theme = round?.placeType || round?.name || TODAY_THEME.theme;
  const themeData = DAILY_THEMES.find(t => t.theme === theme) || TODAY_THEME;

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

  // Auto-share on Farcaster after successful check-in
  useEffect(() => {
    if (!isFarcaster || step !== 2 || !result?.survived || sharedRef.current) return;
    sharedRef.current = true;
    const timer = setTimeout(async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        const shareUrl = result.checkinId
          ? `${window.location.origin}/api/share/checkin/${result.checkinId}`
          : window.location.origin;
        await sdk.actions.composeCast({
          text: `I just checked in to Round ${currentDay} of Last Human Standing! Can you survive the longest?`,
          embeds: [shareUrl],
        });
      } catch { /* user dismissed composer */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isFarcaster, step, result, currentDay]);

  const canSubmit = photoFile != null; // photo is the primary proof

  const handlePhotoSelect = () => fileRef.current?.click();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // If offline, queue the check-in via the service worker
    if (!online) {
      setQueuedCheckin(true);
      setStep(2);
      setResult({ queued: true });
      try {
        await queueCheckin({ lat: pos?.lat, lng: pos?.lng, accuracy: pos?.accuracy });
      } catch {
        // SW queue best-effort
      }
      return;
    }

    setStep(1);
    setSubmitError(null);

    // Upload photo
    let mediaPath = null;
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
        }
      } catch (e) {
        console.warn('photo upload failed', e);
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
      setStep(2);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'check-in failed');
      setStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setPhotoFile(f);
          setPhotoPreview(URL.createObjectURL(f));
        }}
      />

      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
          <span className="text-dim text-lg">←</span>
        </button>
        <div>
          <h2 className="font-display text-3xl text-bone tracking-wide">CHECK IN</h2>
          <p className="font-mono text-dim text-xs">Day {currentDay ?? '—'} · {theme || 'No round set'}</p>
        </div>
      </div>

      {!round ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-3">
          <p className="text-5xl">⏳</p>
          <p className="text-dim font-mono text-sm text-center">No round set for today yet.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col px-5 pb-8"
            >
              {/* Theme card */}
              <div className="bg-smoke border border-ember rounded-3xl p-6 mb-5">
                <p className="font-mono text-dim text-xs tracking-widest uppercase mb-1">Today's challenge</p>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{themeData.emoji}</span>
                  <p className="font-display text-2xl text-bone">{theme}</p>
                </div>
                <p className="text-dim text-sm font-mono">{themeData.description}</p>
                {round.prompt && <p className="text-dim text-xs font-mono mt-2">📸 {round.prompt}</p>}
                <div className="mt-3 flex justify-between text-xs font-mono text-dim">
                  <span>Slots: {round.slotsRemaining}/{round.survivalCap}</span>
                  <span>Anywhere on Earth 🌍</span>
                </div>
              </div>

              {/* Photo capture — primary proof */}
              {photoPreview ? (
                <div className="mb-5 rounded-2xl overflow-hidden border border-neon/40 relative" style={{ height: 200 }}>
                  <img src={photoPreview} alt="check-in" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-ash/80 backdrop-blur rounded-lg px-2 py-1 text-bone text-xs font-mono"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePhotoSelect}
                  className="mb-5 w-full bg-smoke border-2 border-dashed border-neon/40 rounded-2xl py-8 flex flex-col items-center justify-center gap-2 active:scale-98 transition-transform"
                >
                  <span className="text-4xl">📸</span>
                  <span className="text-bone font-mono text-sm">Take a photo — this is your proof</span>
                  <span className="text-dim font-mono text-xs">The community will vote on it</span>
                </button>
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
              <button
                onClick={toggleGps}
                className={`w-full mb-4 py-3 rounded-2xl font-mono text-sm tracking-wide active:scale-95 transition-all border flex items-center justify-center gap-2 ${
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
              </button>

              {submitError && (
                <div className="bg-blood/10 border border-blood/30 rounded-xl p-3 mb-3">
                  <p className="text-blood text-xs font-mono">{submitError}</p>
                </div>
              )}

              {/* Infiltrator toggle */}
              <button
                onClick={() => setInfiltratorMode(!infiltratorMode)}
                className={`w-full mb-3 py-3 rounded-2xl font-mono text-sm tracking-wide active:scale-95 transition-all border ${
                  infiltratorMode
                    ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                    : 'bg-smoke border-ember text-dim'
                }`}
              >
                {infiltratorMode ? '🎭 Infiltrator mode ON — submit something borderline' : '🎭 Go Infiltrator? (risk it for immunity)'}
              </button>
              {infiltratorMode && (
                <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-3 mb-3">
                  <p className="text-purple-300 text-xs font-mono">
                    ⚡ If the crowd votes you HUMAN, you earn immunity tomorrow.
                    If they vote you SUS, you get double elimination risk. Choose wisely.
                  </p>
                </div>
              )}

              {!online && canSubmit && (
                <div className="bg-amber/10 border border-amber/30 rounded-xl p-3 mb-3 flex items-center gap-2">
                  <span className="text-amber text-lg">📡</span>
                  <div className="flex-1">
                    <p className="text-amber text-xs font-mono">You are offline</p>
                    <p className="text-dim text-[10px] font-mono">Check-in will be queued and submitted when you reconnect.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform ${
                  infiltratorMode && canSubmit
                    ? 'bg-purple-600 text-bone animate-pulse-blood'
                    : canSubmit ? 'bg-blood text-bone animate-pulse-blood' : 'bg-ember text-dim'
                }`}
              >
                {!online && canSubmit ? 'QUEUE OFFLINE' : !canSubmit ? 'TAKE A PHOTO FIRST' : infiltratorMode ? '🎭 SUBMIT AS INFILTRATOR' : 'SUBMIT CHECK-IN'}
              </button>
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
              className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-6"
            >
              <div className="w-24 h-24 rounded-full border-4 border-blood border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="font-display text-3xl text-bone">SUBMITTING</p>
                <p className="text-dim font-mono text-sm mt-1">Recording your check-in…</p>
              </div>
            </motion.div>
          )}

          {step === 2 && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-6"
            >
              {result.queued ? (
                <>
                  <div className="w-28 h-28 rounded-full bg-amber/10 border-2 border-amber flex items-center justify-center">
                    <span className="text-6xl">📡</span>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-4xl text-amber mb-1">QUEUED</p>
                    <p className="text-bone font-mono text-sm">Check-in saved offline</p>
                    <p className="text-dim font-mono text-xs mt-2">It will be submitted automatically when you're back online.</p>
                    {queuedCheckin && (
                      <p className="text-amber font-mono text-xs mt-1">✓ Queued with service worker</p>
                    )}
                  </div>
                  <button
                    onClick={() => { onSubmit && onSubmit(); onBack(); }}
                    className="w-full py-4 rounded-2xl font-display text-2xl tracking-widest active:scale-95 transition-transform text-bone bg-smoke border border-ember"
                  >
                    BACK TO GAME
                  </button>
                </>
              ) : result.survived ? (
                <>
                  <div className="w-28 h-28 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center animate-pulse-blood">
                    <span className="text-6xl">✅</span>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-5xl text-neon mb-1">RANK #{result.rank}</p>
                    <p className="text-bone font-mono text-sm">of {result.survivalCap} surviving today</p>
                    {result.gpsShared && (
                      <p className="text-dim font-mono text-xs mt-2">📍 GPS shared · Day {currentDay}</p>
                    )}
                    {!result.gpsShared && (
                      <p className="text-dim font-mono text-xs mt-2">No GPS · community votes decide · Day {currentDay}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-28 h-28 rounded-full bg-blood/10 border-2 border-blood flex items-center justify-center">
                    <span className="text-6xl">💀</span>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-5xl text-blood mb-1">TOO LATE</p>
                    <p className="text-bone font-mono text-sm">You arrived as #{result.rank} (cap was {result.survivalCap})</p>
                    <p className="text-dim font-mono text-xs mt-2">You're out. Stay for the audit + chat.</p>
                  </div>
                  {isFarcaster && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { sdk } = await import("@farcaster/miniapp-sdk");
                          const shareUrl = result.checkinId
                            ? `${window.location.origin}/api/share/checkin/${result.checkinId}`
                            : window.location.origin;
                          await sdk.actions.composeCast({
                            text: `I got eliminated from Last Human Standing on Day ${currentDay}. Ready for round 2?`,
                            embeds: [shareUrl],
                          });
                        } catch { /* user dismissed composer */ }
                      }}
                      className="w-full py-3 rounded-2xl font-display text-lg tracking-widest active:scale-95 transition-transform text-bone bg-indigo/20 border border-indigo/40 mt-2"
                    >
                      SHARE YOUR ELIMINATION
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => { onSubmit && onSubmit(); onBack(); }}
                className="w-full py-4 rounded-2xl font-display text-2xl tracking-widest active:scale-95 transition-transform text-bone bg-smoke border border-ember"
              >
                BACK TO GAME
              </button>

              {isFarcaster && result?.survived && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { sdk } = await import("@farcaster/miniapp-sdk");
                      const shareUrl = result.checkinId
                        ? `${window.location.origin}/api/share/checkin/${result.checkinId}`
                        : window.location.origin;
                      await sdk.actions.composeCast({
                        text: `I just checked in to Round ${currentDay} of Last Human Standing! Can you survive the longest?`,
                        embeds: [shareUrl],
                      });
                    } catch { /* user dismissed composer */ }
                  }}
                  className="w-full py-3 rounded-2xl font-display text-lg tracking-widest active:scale-95 transition-transform text-bone bg-indigo/20 border border-indigo/40 mt-2"
                >
                  SHARE ON FARCASTER
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
