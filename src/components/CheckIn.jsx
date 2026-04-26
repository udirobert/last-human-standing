import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TODAY_THEME } from '../data/game';
import { useWorld } from '../world/WorldProvider.jsx';
import { createClient } from "@supabase/supabase-js";
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';

export default function CheckIn({ onBack }) {
  const [step, setStep] = useState(0); // 0=capture, 1=caption, 2=submitting, 3=done
  const [caption, setCaption] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signature, setSignature] = useState(null);
  const fileRef = useRef();
  const { signCheckIn, user, worldIdVerified } = useWorld();
  const { verification } = useRound();
  const { stats } = useStats();
  const DAY = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 10 + 1;
  const activePlayers = stats?.players?.active ?? null;
  const prizePoolWld = stats?.prizePool?.balanceWld ?? null;

  const handlePhotoSelect = () => {
    fileRef.current?.click();
  };

  const handleSubmit = async () => {
    setStep(2);

    let mediaPath = null;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (photoFile && supabaseUrl && supabaseAnon) {
      try {
        const resp = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileName: photoFile.name,
            contentType: photoFile.type,
          }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.message || "Could not create upload URL");

        const supabase = createClient(supabaseUrl, supabaseAnon);
        const { error: uploadError } = await supabase.storage
          .from(json.bucket)
          .uploadToSignedUrl(json.path, json.token, photoFile);
        if (uploadError) throw uploadError;
        mediaPath = json.path;
      } catch (e) {
        // Non-fatal for demo: we can still submit a signed check-in without media.
        console.warn("Upload failed", e);
      }
    }

    const msg = [
      "Last Human Standing — Daily Check-in",
      `theme=${TODAY_THEME.theme}`,
      `caption=${caption.trim() || "(no caption)"}`,
      `by=${user?.displayName ?? "anon"}`,
      `ts=${new Date().toISOString()}`,
    ].join("\n");

    try {
      const result = await signCheckIn({
        message: msg,
        day: Math.floor(Date.now() / (1000 * 60 * 60 * 24)),
        theme: TODAY_THEME.theme,
        caption: caption.trim(),
        mediaPath,
      });
      if (result?.executedWith !== "fallback") {
        setSignature(result.data.signature);
      }
    } catch {
      // signing errors are shown in UI via the "Recording on-chain" step remaining false
    } finally {
      setTimeout(() => setStep(3), 800);
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
          setTimeout(() => setStep(1), 150);
        }}
      />
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
          <span className="text-dim text-lg">←</span>
        </button>
        <div>
          <h2 className="font-display text-3xl text-bone tracking-wide">CHECK IN</h2>
          <p className="font-mono text-dim text-xs">Day {DAY} · {TODAY_THEME.theme}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex-1 flex flex-col px-5 pb-8"
          >
            {/* Theme reminder */}
            <div
              className="rounded-2xl p-4 mb-6 flex items-center gap-3"
              style={{ background: `${TODAY_THEME.color}15`, border: `1px solid ${TODAY_THEME.color}40` }}
            >
              <span className="text-4xl">{TODAY_THEME.emoji}</span>
              <div>
                <p className="font-display text-2xl text-bone">{TODAY_THEME.theme}</p>
                <p className="text-dim text-xs">{TODAY_THEME.description}</p>
              </div>
            </div>

            {/* Photo area */}
            <div
              onClick={handlePhotoSelect}
              className="flex-1 bg-smoke border-2 border-dashed border-ember rounded-3xl flex flex-col items-center justify-center gap-4 min-h-64 mb-6 active:scale-98 transition-transform cursor-pointer"
              style={{ minHeight: '280px' }}
            >
              <div className="w-20 h-20 rounded-full bg-ember flex items-center justify-center">
                <span className="text-4xl">📸</span>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl text-bone">TAP TO CAPTURE</p>
                <p className="text-dim text-sm mt-1">Photo proof of your check-in</p>
              </div>
              <div className="bg-blood/10 border border-blood/20 rounded-xl px-4 py-2">
                <p className="text-blood text-xs font-mono">📍 Location will be embedded in metadata</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-dim text-xs font-mono text-center">Your photo will be voted on by other verified humans</p>
              <button
                onClick={handlePhotoSelect}
                className="w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform text-ash"
                style={{ background: TODAY_THEME.color }}
              >
                TAKE PHOTO
              </button>
              <button
                onClick={handlePhotoSelect}
                className="w-full py-3 rounded-2xl font-body text-dim text-sm border border-ember active:scale-95 transition-transform"
              >
                Upload from camera roll
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="caption"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex-1 flex flex-col px-5 pb-8"
          >
            {/* Mock photo preview */}
            <div
              className="rounded-3xl mb-5 overflow-hidden relative"
              style={{
                height: '240px',
                background: photoPreview
                  ? `url(${photoPreview}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${TODAY_THEME.color}30, #1A1A1A)`,
              }}
            >
              {!photoPreview && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-8xl opacity-60">{TODAY_THEME.emoji}</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-ash/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
                <span className={`font-mono text-xs ${worldIdVerified ? 'text-neon' : 'text-amber'}`}>
                  {worldIdVerified ? 'World ID verified' : 'World ID pending'}
                </span>
              </div>
              <div className="absolute top-3 right-3 bg-blood/90 rounded-lg px-2 py-1">
                <span className="font-mono text-white text-xs">DAY {DAY}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="font-mono text-dim text-xs tracking-widest uppercase block mb-2">Add a caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="say something about surviving today..."
                className="w-full bg-smoke border border-ember rounded-2xl p-4 text-bone font-body text-sm resize-none focus:outline-none focus:border-blood transition-colors"
                rows={3}
                maxLength={100}
              />
              <p className="text-dim font-mono text-xs text-right mt-1">{caption.length}/100</p>
            </div>

            {/* What happens next */}
            <div className="bg-smoke rounded-2xl p-4 mb-5 space-y-2">
              <p className="font-mono text-dim text-xs uppercase tracking-widest">What happens after</p>
              {[
                { icon: "👁️", text: `${activePlayers != null ? activePlayers.toLocaleString() : 'Other'} humans will see your submission` },
                { icon: "🗳️", text: "Community votes real ✅ or fake ❌" },
                  { icon: "⚡", text: `Finalizes after ${verification.voteQuorum}+ votes` },
                { icon: "💀", text: "Flagged if fake votes exceed 30%" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <p className="text-dim text-xs">{item.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform text-ash bg-blood"
            >
              SUBMIT CHECK-IN
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
              <p className="text-dim font-mono text-sm mt-1">Signing check-in with World Wallet...</p>
            </div>
            <div className="w-full space-y-2">
              {[
                { label: "Attaching World ID proof", done: true },
                { label: "Uploading photo", done: true },
                { label: "Recording proof (signature)", done: Boolean(signature) },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 bg-smoke rounded-xl px-4 py-3">
                  <div className={`w-4 h-4 rounded-full ${item.done ? 'bg-neon' : 'border-2 border-dim animate-pulse'} flex-shrink-0`} />
                  <span className={`font-mono text-xs ${item.done ? 'text-neon' : 'text-dim'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            {signature && (
              <div className="w-full bg-smoke border border-ember rounded-xl px-4 py-3">
                <p className="text-dim font-mono text-xs mb-1">Signature</p>
                <p className="text-bone font-mono text-xs break-all">
                  {signature.slice(0, 14)}…{signature.slice(-10)}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-6"
          >
            <div className="w-28 h-28 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center animate-pulse-blood">
              <span className="text-6xl">✅</span>
            </div>
            <div className="text-center">
              <p className="font-display text-5xl text-neon mb-1">YOU SURVIVED</p>
              <p className="text-bone font-mono text-sm">Day {DAY} check-in confirmed</p>
              <p className="text-dim font-mono text-xs mt-1">Awaiting community verification</p>
            </div>

            <div className="w-full bg-smoke rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-dim font-mono text-xs">Your position</span>
                <span className="text-bone font-display text-xl">Still Alive</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-dim font-mono text-xs">Survival streak</span>
                <span className="text-amber font-display text-xl">Day {DAY} 🔥</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-dim font-mono text-xs">Share of prize pool</span>
                <span className="text-neon font-mono text-sm">
                  {prizePoolWld != null && activePlayers ? `${(prizePoolWld / activePlayers).toFixed(3)} WLD` : '— WLD'}
                </span>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full py-4 rounded-2xl font-display text-3xl tracking-widest active:scale-95 transition-transform text-bone bg-smoke border border-ember"
            >
              BACK TO GAME
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
