import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function CheckIn({ onBack, onSubmit }) {
  const { round, currentDay, refresh: refreshRound } = useRound();
  const { signCheckIn } = useWorld();
  const [step, setStep] = useState(0); // 0=locate, 1=photo (optional), 2=submitting, 3=done
  const [pos, setPos] = useState(null); // { lat, lng, accuracy }
  const [posError, setPosError] = useState(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator
      ? null
      : 'Geolocation not available in this browser'
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [result, setResult] = useState(null); // { rank, survived, distanceM, survivalCap }
  const [submitError, setSubmitError] = useState(null);
  const fileRef = useRef();

  const targetLat = round?.lat;
  const targetLng = round?.lng;
  const radiusM = round?.radiusM ?? 100;

  // Live distance (recomputed client-side as GPS updates)
  const distance = pos && targetLat != null && targetLng != null
    ? haversineMeters(pos.lat, pos.lng, targetLat, targetLng)
    : null;
  const withinRadius = distance != null && distance <= radiusM;

  // Watch position while we're on this screen
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setPosError(null);
      },
      (err) => setPosError(err.message || 'Could not read location'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const handlePhotoSelect = () => fileRef.current?.click();

  const handleSubmit = async () => {
    if (!pos || !withinRadius) return;
    setStep(2);
    setSubmitError(null);

    // Upload photo (best-effort; non-blocking for survival)
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

    // Sign + record check-in (best-effort signature; real survival decided by /api/checkin/location)
    try {
      await signCheckIn({
        message: [
          'Last Human Standing — Geo check-in',
          `day=${currentDay}`,
          `location=${round?.name ?? ''}`,
          `lat=${pos.lat}`,
          `lng=${pos.lng}`,
          `ts=${new Date().toISOString()}`,
        ].join('\n'),
        day: currentDay ?? 0,
        theme: round?.name ?? '',
        caption: '',
        mediaPath,
      });
    } catch {
      // signature is bonus, not required for survival
    }

    // The actual survival call
    try {
      const resp = await fetch('/api/checkin/location', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setSubmitError(json?.error || 'check-in failed');
        setStep(0);
        return;
      }
      setResult(json);
      refreshRound();
      setStep(3);
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
          <p className="font-mono text-dim text-xs">Day {currentDay ?? '—'} · {round?.name ?? 'No round set'}</p>
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
              key="locate"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col px-5 pb-8"
            >
              <div className="bg-smoke border border-ember rounded-3xl p-6 mb-5">
                <p className="font-mono text-dim text-xs tracking-widest uppercase mb-1">Target</p>
                <p className="font-display text-2xl text-bone mb-2">{round.name}</p>
                {round.prompt && <p className="text-dim text-xs font-mono">📸 {round.prompt}</p>}
                <div className="mt-3 flex justify-between text-xs font-mono text-dim">
                  <span>Radius: {radiusM}m</span>
                  <span>Slots: {round.slotsRemaining}/{round.survivalCap}</span>
                </div>
              </div>

              {/* GPS readout */}
              <div className={`rounded-3xl p-6 mb-5 border ${withinRadius ? 'bg-neon/10 border-neon/40' : 'bg-smoke border-ember'}`}>
                {!pos && !posError && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-amber border-t-transparent animate-spin" />
                    <p className="text-bone font-mono text-sm">Getting your location…</p>
                  </div>
                )}
                {posError && (
                  <div>
                    <p className="text-blood font-mono text-sm mb-1">📵 {posError}</p>
                    <p className="text-dim text-xs">Enable location access to check in.</p>
                  </div>
                )}
                {pos && distance != null && (
                  <div>
                    <p className="font-mono text-dim text-xs tracking-widest uppercase mb-1">Distance to target</p>
                    <p className={`font-display text-5xl leading-none ${withinRadius ? 'text-neon' : 'text-amber'}`}>
                      {distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(2)} km`}
                    </p>
                    <p className="text-dim text-xs font-mono mt-2">
                      Accuracy ±{Math.round(pos.accuracy ?? 0)}m
                    </p>
                    {!withinRadius && (
                      <p className="text-amber text-xs font-mono mt-3">
                        Get closer. Need to be within {radiusM}m to check in.
                      </p>
                    )}
                    {withinRadius && (
                      <p className="text-neon text-xs font-mono mt-3">✓ You're in range. Capture a photo (optional) and submit.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Optional photo */}
              {photoPreview ? (
                <div className="mb-5 rounded-2xl overflow-hidden border border-ember relative" style={{ height: 180 }}>
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
                  className="mb-5 w-full bg-smoke border-2 border-dashed border-ember rounded-2xl py-6 flex items-center justify-center gap-3 active:scale-98 transition-transform"
                >
                  <span className="text-2xl">📸</span>
                  <span className="text-bone font-mono text-sm">Take a photo (optional · helps audit)</span>
                </button>
              )}

              {submitError && (
                <div className="bg-blood/10 border border-blood/30 rounded-xl p-3 mb-3">
                  <p className="text-blood text-xs font-mono">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!withinRadius}
                className={`w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform ${
                  withinRadius ? 'bg-blood text-bone animate-pulse-blood' : 'bg-ember text-dim'
                }`}
              >
                CONFIRM I'M HERE
              </button>
            </motion.div>
          )}

          {step === 2 && (
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

          {step === 3 && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-6"
            >
              {result.survived ? (
                <>
                  <div className="w-28 h-28 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center animate-pulse-blood">
                    <span className="text-6xl">✅</span>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-5xl text-neon mb-1">RANK #{result.rank}</p>
                    <p className="text-bone font-mono text-sm">of {result.survivalCap} surviving today</p>
                    <p className="text-dim font-mono text-xs mt-2">Distance: {result.distanceM}m · Day {currentDay}</p>
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
                </>
              )}

              <button
                onClick={() => { onSubmit && onSubmit(); onBack(); }}
                className="w-full py-4 rounded-2xl font-display text-2xl tracking-widest active:scale-95 transition-transform text-bone bg-smoke border border-ember"
              >
                BACK TO GAME
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
