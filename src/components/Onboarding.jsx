import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import Countdown from './Countdown.jsx';
import BrowserWalletPay from '../wallet/BrowserWalletPay.jsx';
const WorldIdVerify = lazy(() => import('../world/WorldIdVerify.jsx'));

export default function Onboarding({ onEnter }) {
  const [step, setStep] = useState(0); // 0=splash, 1=rules, 2=verify
  const [authing, setAuthing] = useState(false);
  const [paying, setPaying] = useState(false);
  const enteredRef = useRef(false);
  const { phase, launchAt, cohortSize, reservedCount, currentDay, round, you, refresh: refreshRound } = useRound();

  const {
    user,
    isWorldApp,
    installAttempted,
    walletAuthed,
    entryPaid,
    worldIdVerified,
    lastError,
    walletAuth,
    payEntryFee,
    markBrowserPaid,
    prizePoolAddress,
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
      await payEntryFee({ amountWld: 1, referredBy });
    } finally {
      setPaying(false);
    }
  };



  // Splash CTA varies by phase + reservation status
  const youReserved = Boolean(you?.isPaid) || entryPaid;
  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  const stepLabels = ['Welcome', 'Rules', 'Reserve'];

  // Email + referral state for the "YOU'RE IN" screen
  const [emailInput, setEmailInput] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [myRefCode, setMyRefCode] = useState(null);

  const [referredBy] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('ref') || null; } catch { return null; }
  });

  // Once verified, fetch the user's referral code from roster
  useEffect(() => {
    if (!verified || !user?.address) return;
    fetch('/api/cohort/roster').then(r => r.json()).then(json => {
      const me = (json.roster || []).find(r => r.address?.toLowerCase() === user.address.toLowerCase());
      if (me?.referral_code) setMyRefCode(me.referral_code);
    }).catch(() => {});
  }, [verified, user?.address]);

  const handleSaveEmail = async () => {
    if (!emailInput || emailSaved) return;
    try {
      const resp = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, referredBy }),
      });
      const json = await resp.json();
      if (json.ok) {
        setEmailSaved(true);
        if (json.referralCode) setMyRefCode(json.referralCode);
      }
    } catch (error) {
      void error;
    }
  };

  const clearErrorAndRetry = () => {
    // Clear error state and retry the last failed action
    if (!walletAuthed) {
      handleWalletAuth();
    } else if (!entryPaid) {
      handlePay();
    }
  };

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body overflow-hidden">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 pt-6 px-6">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              className={`flex items-center gap-1.5 transition-all ${
                i === step
                  ? 'opacity-100'
                  : i < step
                    ? 'opacity-60 cursor-pointer'
                    : 'opacity-30'
              }`}
            >
              <div className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-blood scale-125' : i < step ? 'bg-neon' : 'bg-ember'
              }`} />
              <span className="font-mono text-xs text-dim">{label}</span>
            </button>
            {i < stepLabels.length - 1 && (
              <div className={`w-4 h-px ${i < step ? 'bg-neon/40' : 'bg-ember'}`} />
            )}
          </div>
        ))}
      </div>

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
                { n: "02", title: "FIND THE DAILY THEME", body: "Each day a place type drops — a café, a park, a beach. Find one anywhere in the world. Be one of the first " + (round?.survivalCap ?? 25) + " to check in.", icon: "🌍" },
                { n: "03", title: "PROVE YOU'RE HUMAN", body: "Snap a photo of the daily prompt. Other humans vote HUMAN or SUS on your check-in. Optional GPS adds credibility.", icon: "📸" },
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
                  {isWorldApp ? (
                    <div className="bg-smoke border border-ember rounded-3xl p-8 flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full border-2 border-neon flex items-center justify-center relative">
                        <span className="text-5xl">🌐</span>
                      </div>
                      <div className="text-center">
                        <p className="text-bone font-mono text-sm">Authenticate and pay to lock in your slot</p>
                        <p className="text-dim text-xs mt-1">One human, one slot</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-smoke border border-ember rounded-3xl p-6 space-y-4">
                      <div className="text-center">
                        <p className="text-bone font-display text-2xl tracking-wide mb-1">RESERVE YOUR SPOT</p>
                        <p className="text-dim text-xs font-mono">Connect a wallet to pay 1 WLD on World Chain</p>
                      </div>
                      <BrowserWalletPay
                        prizePoolAddress={prizePoolAddress}
                        referredBy={referredBy}
                        onPaid={(addr) => markBrowserPaid(addr)}
                      />
                      <div className="border-t border-ember/30 pt-3 text-center">
                        <p className="text-dim text-[10px] font-mono">
                          For full trust level, open in{' '}
                          <a href="https://worldcoin.org/download" target="_blank" rel="noopener" className="text-amber underline">World App</a>
                          {' '}and verify with World ID
                        </p>
                      </div>
                    </div>
                  )}

                  {lastError && (
                    <div className="bg-blood/10 border border-blood/30 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-blood text-xs font-mono">{lastError}</p>
                      </div>
                      <button
                        onClick={clearErrorAndRetry}
                        className="flex-shrink-0 bg-blood/20 text-blood text-xs font-mono px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                      >
                        Retry
                      </button>
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

                  {/* Email + referral code */}
                  {isPrelaunch && (
                    <div className="w-full bg-smoke border border-ember rounded-2xl p-4 mt-2">
                      {!emailSaved ? (
                        <>
                          <p className="text-dim text-xs font-mono mb-2">Add your email for updates:</p>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              placeholder="your@email.com"
                              className="flex-1 bg-ash border border-ember rounded-xl px-3 py-2 text-bone text-sm font-mono placeholder:text-dim/50 outline-none focus:border-amber transition-colors"
                            />
                            <button onClick={handleSaveEmail} className="bg-amber text-ash font-mono text-sm px-3 py-2 rounded-xl active:scale-95 transition-transform">Save</button>
                          </div>
                        </>
                      ) : (
                        <p className="text-neon text-xs font-mono">✓ Email saved</p>
                      )}
                      {myRefCode && (
                        <div className="mt-3 pt-3 border-t border-ember/30">
                          <p className="text-dim text-xs font-mono mb-2">Share your link — top referrers get priority check-in:</p>
                          <div className="bg-ash border border-ember rounded-xl px-3 py-2 mb-2">
                            <p className="text-bone text-xs font-mono truncate">lasthumanstanding.thisyearnofear.com/?ref={myRefCode}</p>
                          </div>
                          <button
                            onClick={() => {
                              const url = `https://lasthumanstanding.thisyearnofear.com/?ref=${myRefCode}`;
                              const text = `I just reserved my spot in Last Human Standing. Can you survive? 🧍`;
                              if (navigator.share) {
                                navigator.share({ title: 'Last Human Standing', text, url }).catch(() => {
                                  navigator.clipboard?.writeText(`${text}\n${url}`);
                                });
                              } else {
                                navigator.clipboard?.writeText(`${text}\n${url}`);
                              }
                            }}
                            className="w-full py-2 rounded-xl bg-amber/10 border border-amber/40 font-mono text-amber text-xs tracking-wide active:scale-95 transition-transform"
                          >
                            📣 Share your invite link
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
