import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import { DEMO_STATS } from '../data/game';
const WorldIdVerify = lazy(() => import('../world/WorldIdVerify.jsx'));

export default function Onboarding({ onEnter }) {
  const [step, setStep] = useState(0); // 0=splash, 1=rules, 2=verify
  const [authing, setAuthing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [entering, setEntering] = useState(false);
  const enteredRef = useRef(false);
  const { round, verification } = useRound();
  const { stats } = useStats();

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

  // Pre-compute random values for drip marks to avoid impure functions during render
  const DRIP_HEIGHTS = [45, 28, 52, 35, 60, 42, 38, 55];
  const DRIP_MARGINS = [12, 5, 18, 8, 3, 15, 20, 10];
  const dripMarks = DRIP_HEIGHTS.map((height, i) => ({
    height,
    marginLeft: DRIP_MARGINS[i],
  }));

  const onEnterRef = useRef(onEnter);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);

  useEffect(() => {
    if (!verified || enteredRef.current) return;
    enteredRef.current = true;
    setEntering(true);
    const t = setTimeout(() => onEnterRef.current(), 900);
    return () => clearTimeout(t);
  }, [verified]);

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
    // Small delay so the user sees the screen before it auto-completes
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
            {/* Drip marks */}
            <div className="absolute top-0 left-0 right-0 flex justify-around pointer-events-none">
              {dripMarks.map((mark, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-blood rounded-b-full opacity-60"
                  style={{
                    height: `${mark.height}px`,
                    animationDelay: `${i * 0.3}s`,
                    marginLeft: `${mark.marginLeft}px`,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col items-center mt-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-smoke border-2 border-blood flex items-center justify-center animate-pulse-blood">
                  <span className="text-5xl">💀</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blood rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-mono font-bold">47</span>
                </div>
              </div>

              <h1 className="font-display text-6xl text-bone text-center leading-none tracking-wider animate-glow">
                LAST<br />HUMAN<br />STANDING
              </h1>

              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                <span className="text-neon font-mono text-xs tracking-widest uppercase">
                  {(() => {
                    const raw = stats?.players?.active;
                    const count = (raw != null && raw > 0) ? raw : DEMO_STATS.activePlayers;
                    return `${count.toLocaleString()} humans alive`;
                  })()}
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: "DAY", val: String(Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 10 + 1) },
                  { label: "PRIZE", val: (() => { const v = stats?.prizePool?.balanceWld; return (v != null && v > 0) ? `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} WLD` : `${DEMO_STATS.prizePoolWld.toLocaleString()} WLD`; })() },
                  { label: "PLAYERS", val: (() => { const v = stats?.players?.total; return (v != null && v > 0) ? v.toLocaleString() : DEMO_STATS.totalPlayers.toLocaleString(); })() },
                ].map((s) => (
                  <div key={s.label} className="bg-smoke rounded-xl p-3 text-center border border-ember">
                    <div className="text-dim font-mono text-xs tracking-widest">{s.label}</div>
                    <div className="text-bone font-display text-2xl mt-0.5">{s.val}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full bg-blood text-bone font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
              >
                ENTER THE GAME
              </button>
              <p className="text-dim text-xs text-center font-mono">
                World ID required · One human, one account
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
            <p className="text-dim text-sm font-mono mb-8">simple. brutal. fair.</p>

            <div className="space-y-4 flex-1">
              {[
                { n: "01", title: "ONE HUMAN, ONE ACCOUNT", body: "World ID proves you're real. No bots. No alt accounts. Just you.", icon: "🫂" },
                { n: "02", title: "CHECK IN DAILY", body: "A new theme drops every day. Miss it, and you're out. No exceptions.", icon: "📸" },
                { n: "03", title: "COMMUNITY VERIFIES", body: "Other humans vote on your submission. Too many fake votes and you're eliminated.", icon: "✅" },
                { n: "04", title: "LAST ONE WINS", body: "The final human standing splits the prize pool. Real money. On-chain.", icon: "🏆" },
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
                  Entry fee: <span className="text-amber font-mono">1 WLD</span> goes directly to the prize pool via World Wallet
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
                <h2 className="font-display text-5xl text-bone mb-2">PROVE YOUR<br />HUMANITY</h2>
                <p className="text-dim text-sm font-mono">World App · wallet auth + entry fee</p>
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
                          ? "Open in World App for verification"
                          : "Authenticate and pay to join"}
                      </p>
                      <p className="text-dim text-xs mt-1">One human, one account · Anti-bot game</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      "✓ Wallet-authenticated identity (SIWE)",
                      "✓ Entry fee paid into the prize pool (WLD)",
                      "✓ World Chat enabled for verified players",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-dim text-sm font-mono">
                        <span className="text-neon">{item}</span>
                      </div>
                    ))}
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
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center">
                    <span className="text-5xl">✅</span>
                  </div>
                  <div className="text-center">
                    <p className="text-neon font-display text-3xl">READY</p>
                    <p className="text-dim font-mono text-sm mt-1">Entering game...</p>
                  </div>
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
                    : "World App detected · complete both steps to enter"}
                </p>

                {round && (
                  <div className="bg-smoke border border-ember rounded-xl p-3">
                    <p className="text-dim text-xs font-mono text-center">
                      {round.state === "active"
                        ? "Prize round is active."
                        : `Warmup: ${round.paidCount}/${round.joinQuorum} joined · prize activates at quorum.`}
                    </p>
                    <p className="text-dim text-xs font-mono text-center mt-1">
                      Check-ins finalize at {verification.voteQuorum} votes
                      {verification.voteQuorum !== verification.voteQuorumNormal ? " (low activity today)" : ""}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
