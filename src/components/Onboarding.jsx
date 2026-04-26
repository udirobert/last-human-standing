import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import Countdown from './Countdown.jsx';
const WorldIdVerify = lazy(() => import('../world/WorldIdVerify.jsx'));

export default function Onboarding({ onEnter }) {
  const [step, setStep] = useState(0); // 0=splash, 1=rules, 2=verify
  const [authing, setAuthing] = useState(false);
  const [paying, setPaying] = useState(false);
  const enteredRef = useRef(false);
  const { phase, launchAt, cohortSize, reservedCount, currentDay, round, you, refresh: refreshRound } = useRound();

  const {
    isWorldApp,
    installAttempted,
    walletAuthed,
    entryPaid,
    worldIdVerified,
    lastError,
    walletAuth,
    payEntryFee,
  } = useWorld();

  const requireWorldId = import.meta.env.VITE_ENABLE_IDKIT === "true";
  const verified = walletAuthed && entryPaid && (!requireWorldId || worldIdVerified);

  // Pre-launch heuristics
  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';

  const onEnterRef = useRef(onEnter);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);

  // Auto-enter game when verified — but ONLY if game is live.
  // In pre-launch, stay on the "you're in" confirmation so the user can see the countdown.
  useEffect(() => {
    if (!verified || enteredRef.current) return;
    if (!isLive) return;
    enteredRef.current = true;
    const t = setTimeout(() => onEnterRef.current(), 900);
    return () => clearTimeout(t);
  }, [verified, isLive]);

  // Refresh game state right after a successful pay
  useEffect(() => {
    if (entryPaid) refreshRound();
  }, [entryPaid, refreshRound]);

  const handleWalletAuth = async () => {
    if (authing || walletAuthed) return;
    setAuthing(true);
    try {
      await walletAuth();
    } finally {
      setAuthing(false);
    }
  };

  const handlePay = async () => {
    if (paying || entryPaid) return;
    setPaying(true);
    try {
      await payEntryFee({ amountWld: 1 });
    } finally {
      setPaying(false);
    }
  };

  // In browser demo mode, auto-complete auth + pay when user reaches step 2
  useEffect(() => {
    if (step !== 2 || isWorldApp || !installAttempted) return;
    const t = setTimeout(async () => {
      if (!walletAuthed) {
        try { await walletAuth(); } catch { /* ignore */ }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [step, isWorldApp, installAttempted, walletAuthed]);

  useEffect(() => {
    if (step !== 2 || isWorldApp || !installAttempted) return;
    if (!walletAuthed || entryPaid) return;
    const t = setTimeout(async () => {
      try { await payEntryFee({ amountWld: 1 }); } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(t);
  }, [step, isWorldApp, installAttempted, walletAuthed, entryPaid]);

  // Splash CTA varies by phase + reservation status
  const youReserved = Boolean(you?.isPaid) || entryPaid;
  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-between px-6 pt-20 pb-12"
          >
            <div className="flex flex-col items-center mt-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-smoke border-2 border-blood flex items-center justify-center animate-pulse-blood">
                  <span className="text-5xl">💀</span>
                </div>
                {currentDay != null && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blood rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-mono font-bold">{currentDay}</span>
                  </div>
                )}
              </div>

              <h1 className="font-display text-6xl text-bone text-center leading-none tracking-wider animate-glow">
                LAST<br />HUMAN<br />STANDING
              </h1>

              <p className="text-dim font-mono text-xs text-center mt-4 max-w-xs">
                A daily real-world elimination game. First {round?.survivalCap ?? 25} to the location survive.
              </p>
            </div>

            <div className="w-full space-y-3">
              {/* Phase-aware status block */}
              {isPrelaunch && (
                <div className="bg-smoke rounded-2xl p-4 border border-amber/30">
                  <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Cohort #1 · opens in</p>
                  {launchAt ? (
                    <Countdown targetIso={launchAt} className="font-display text-3xl text-bone" />
                  ) : (
                    <p className="font-display text-2xl text-dim">TBA</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs font-mono text-dim">
                    <span>{reservedCount.toLocaleString()} of {cohortSize} reserved</span>
                    <span>{cohortPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-ember rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${cohortPct}%` }} />
                  </div>
                </div>
              )}

              {isLive && (
                <div className="bg-smoke rounded-2xl p-4 border border-neon/30">
                  <p className="font-mono text-neon text-xs tracking-widest uppercase mb-1">Live · Day {currentDay ?? '—'}</p>
                  {round ? (
                    <>
                      <p className="font-display text-2xl text-bone leading-tight">{round.name}</p>
                      <p className="text-dim text-xs font-mono mt-1">{round.slotsRemaining} of {round.survivalCap} slots remaining</p>
                    </>
                  ) : (
                    <p className="font-display text-2xl text-dim">No round set yet</p>
                  )}
                </div>
              )}

              <button
                onClick={() => setStep(youReserved ? 2 : 1)}
                className="w-full bg-blood text-bone font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
              >
                {youReserved ? 'CONTINUE' : isPrelaunch ? 'RESERVE YOUR SLOT' : 'ENTER THE ARENA'}
              </button>
              <p className="text-dim text-xs text-center font-mono">
                World ID required · One human, one slot
              </p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="rules"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="flex-1 flex flex-col px-6 pt-14 pb-12"
          >
            <button onClick={() => setStep(0)} className="text-dim text-sm mb-8 text-left">← back</button>
            <h2 className="font-display text-5xl text-bone mb-2 animate-glow">THE RULES</h2>
            <p className="text-dim text-sm font-mono mb-8">simple. brutal. real-world.</p>

            <div className="space-y-4 flex-1">
              {[
                { n: "01", title: "ONE HUMAN, ONE SLOT", body: "World ID + wallet auth. No bots. No alts. Cohort caps at " + cohortSize + ".", icon: "🫂" },
                { n: "02", title: "GO TO THE LOCATION", body: "Each day a GPS pin drops. Be one of the first " + (round?.survivalCap ?? 25) + " physically there in the time window.", icon: "📍" },
                { n: "03", title: "PROVE YOU'RE THERE", body: "GPS proximity + a photo of the daily prompt. Other humans audit your check-in.", icon: "📸" },
                { n: "04", title: "LAST ONE WINS", body: "Cap shrinks each day until one human remains. Survivor takes the on-chain pot.", icon: "🏆" },
              ].map((rule) => (
                <motion.div
                  key={rule.n}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: parseInt(rule.n) * 0.1 }}
                  className="flex gap-4 bg-smoke rounded-2xl p-4 border border-ember"
                >
                  <div className="text-3xl flex-shrink-0 mt-0.5">{rule.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-blood text-xs">{rule.n}</span>
                      <span className="font-display text-bone text-xl tracking-wide">{rule.title}</span>
                    </div>
                    <p className="text-dim text-sm leading-relaxed">{rule.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div className="bg-ember border border-blood/30 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-bone text-xs leading-relaxed">
                  Entry fee: <span className="text-amber font-mono">1 WLD</span> locks your slot in the cohort and grows the on-chain prize pool
                </p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-blood text-bone font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
              >
                I UNDERSTAND
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="verify"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-between px-6 pt-14 pb-12"
          >
            <button onClick={() => setStep(1)} className="self-start text-dim text-sm mb-8">← back</button>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="mb-8 text-center">
                <h2 className="font-display text-5xl text-bone mb-2">RESERVE<br />YOUR SLOT</h2>
                <p className="text-dim text-sm font-mono">Wallet auth + 1 WLD entry fee</p>
              </div>

              {!verified ? (
                <div className="w-full space-y-6">
                  <div className="bg-smoke border border-ember rounded-3xl p-8 flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full border-2 border-neon flex items-center justify-center relative">
                      <span className="text-5xl">🌐</span>
                    </div>
                    <div className="text-center">
                      <p className="text-bone font-mono text-sm">
                        {installAttempted && !isWorldApp
                          ? "Open in World App for real auth + pay"
                          : "Authenticate and pay to lock in your slot"}
                      </p>
                      <p className="text-dim text-xs mt-1">One human, one slot</p>
                    </div>
                  </div>

                  {lastError && (
                    <div className="bg-blood/10 border border-blood/30 rounded-xl p-3">
                      <p className="text-blood text-xs font-mono">{lastError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div className="w-24 h-24 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center">
                    <span className="text-5xl">✅</span>
                  </div>
                  <div className="text-center">
                    <p className="text-neon font-display text-3xl">YOU'RE IN</p>
                    {isPrelaunch && launchAt && (
                      <>
                        <p className="text-dim font-mono text-xs mt-2">Day 1 starts in</p>
                        <Countdown targetIso={launchAt} className="font-display text-3xl text-amber mt-1" />
                      </>
                    )}
                    {isLive && (
                      <p className="text-dim font-mono text-sm mt-1">Entering arena…</p>
                    )}
                  </div>
                  {isPrelaunch && (
                    <button
                      onClick={() => onEnter()}
                      className="w-full bg-smoke text-bone font-display text-2xl tracking-widest py-3 rounded-2xl border border-ember active:scale-95 transition-transform mt-4"
                    >
                      ENTER LOBBY
                    </button>
                  )}
                </motion.div>
              )}
            </div>

            {!verified && (
              <div className="w-full space-y-3">
                <button
                  onClick={handleWalletAuth}
                  disabled={authing || walletAuthed}
                  className={`w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all ${
                    walletAuthed ? 'bg-neon/20 text-neon border border-neon/40' : 'bg-neon text-ash'
                  }`}
                >
                  {walletAuthed ? "WALLET AUTHED ✓" : authing ? "AUTHING..." : "SIGN IN (WALLET)"}
                </button>

                <button
                  onClick={handlePay}
                  disabled={paying || !walletAuthed || entryPaid}
                  className={`w-full font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-all ${
                    !walletAuthed
                      ? 'bg-ember text-dim'
                      : entryPaid
                        ? 'bg-amber/20 text-amber border border-amber/40'
                        : 'bg-amber text-ash'
                  }`}
                >
                  {entryPaid ? "ENTRY PAID ✓" : paying ? "PAYING..." : "PAY ENTRY (1 WLD)"}
                </button>

                {walletAuthed && entryPaid && requireWorldId && !worldIdVerified && (
                  <Suspense fallback={<p className="text-dim text-xs font-mono text-center">Loading World ID…</p>}>
                    <WorldIdVerify />
                  </Suspense>
                )}

                <p className="text-dim text-xs text-center font-mono">
                  {installAttempted && !isWorldApp
                    ? "Running in browser mode · Open via World App for real auth + payments"
                    : "World App detected · complete both steps to lock in your slot"}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
