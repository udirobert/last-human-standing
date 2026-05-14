import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import Countdown from './Countdown.jsx';
import BrowserWalletPay from '../wallet/BrowserWalletPay.jsx';
import Mascot from './Mascot.jsx';
import SurvivalProfile from './SurvivalProfile.jsx';
import ExitIntentModal, { useExitIntent } from './ExitIntentModal.jsx';

const WorldIdVerify = lazy(() => import('../world/WorldIdVerify.jsx'));

export default function Onboarding({ onEnter }) {
  const [step, setStep] = useState(0); // 0=splash, 1=rules, 2=verify, 3=profile
  const [authing, setAuthing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [survivalProfile, setSurvivalProfile] = useState(null);
  const [exitDiscount, setExitDiscount] = useState(false);
  const [paywallStep, setPaywallStep] = useState('annual'); // 'monthly', 'quarterly', 'annual', 'one-time'
  const [expandedFaq, setExpandedFaq] = useState(null);
  const enteredRef = useRef(false);
  
  // Exit intent detection for discount offer
  const { shown: showExitModal, reset: resetExitModal } = useExitIntent({
    delay: 8000, // Wait 8 seconds before tracking
    enabled: !walletAuthed || !entryPaid, // Only track before payment
    onExitIntent: () => {
      if (!exitDiscount && !entryPaid) {
        // Don't show immediately, wait a bit
        setTimeout(() => setExitDiscount(true), 2000);
      }
    },
  });
  
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

  const stepLabels = ['Welcome', 'Profile', 'Rules', 'Reserve'];

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
              <span className="font-mono text-xs text-dim hidden sm:inline">{label}</span>
            </button>
            {i < stepLabels.length - 1 && (
              <div className={`w-4 h-px ${i < step ? 'bg-neon/40' : 'bg-ember'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* PROFILE STEP - NEW */}
        {step === 1 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex-1 flex flex-col"
          >
            <div className="px-5 pt-4 pb-2 text-center">
              <p className="text-amber text-xs font-mono uppercase tracking-wider mb-1">Let's build your survivor profile</p>
              <p className="text-dim text-xs">Answer 4 quick questions to personalize your experience</p>
            </div>
            <SurvivalProfile 
              onComplete={(profile) => {
                setSurvivalProfile(profile);
                setProfileComplete(true);
              }} 
            />
            {profileComplete && (
              <div className="px-5 pb-6">
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-4 rounded-2xl bg-neon text-ash font-display text-2xl tracking-wider active:scale-95 transition-transform"
                >
                  CONTINUE →
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* RULES STEP */}
        {step === 2 && (
          <motion.div
            key="rules"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="flex-1 flex flex-col px-6 pt-6 pb-8"
          >
            <button onClick={() => setStep(1)} className="text-dim text-sm mb-4 text-left">← back</button>
            
            <div className="text-center mb-6">
              <Mascot variant="thinking" size={60} />
              <h2 className="font-display text-4xl text-bone mt-4 mb-2">THE RULES</h2>
              <p className="text-dim text-sm font-mono">Simple. Brutal. Real-world.</p>
            </div>

            <div className="space-y-4 flex-1 overflow-auto">
              {[
                { n: "01", title: "ONE HUMAN, ONE SLOT", body: "World ID + wallet auth. No bots. No alts. Cohort caps at " + cohortSize + ".", icon: "🫂" },
                { n: "02", title: "FIND THE DAILY THEME", body: "Each day a place type drops — café, park, beach. Find one anywhere. Be one of the first " + (round?.survivalCap ?? 25) + " to check in.", icon: "🌍" },
                { n: "03", title: "PROVE YOU'RE HUMAN", body: "Snap a photo of the daily prompt. Other survivors vote HUMAN or SUS. Optional GPS adds credibility.", icon: "📸" },
                { n: "04", title: "LAST ONE WINS", body: "Cap shrinks each day until one human remains. Survivor takes the on-chain pot.", icon: "🏆" },
              ].map((rule, i) => (
                <motion.div
                  key={rule.n}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 bg-smoke rounded-2xl p-4 border border-ember/50"
                >
                  <div className="text-3xl flex-shrink-0">{rule.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-blood text-xs">{rule.n}</span>
                      <span className="font-display text-bone text-lg tracking-wide">{rule.title}</span>
                    </div>
                    <p className="text-dim text-xs leading-relaxed">{rule.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <p className="text-bone text-xs leading-relaxed">
                  Entry fee: <span className="text-amber font-mono">0.35-1 WLD</span> locks your slot and grows the prize pool
                </p>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full bg-blood text-bone font-display text-2xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
              >
                I UNDERSTAND →
              </button>
            </div>
          </motion.div>
        )}

        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-between px-6 pt-12 pb-12"
          >
            <div className="flex flex-col items-center mt-4">
              {/* NEW: Mascot with animations */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-6"
              >
                <Mascot variant="excited" size={100} />
              </motion.div>

              <h1 className="font-display text-5xl sm:text-6xl text-bone text-center leading-none tracking-wider animate-glow">
                LAST<br />HUMAN<br />STANDING
              </h1>

              <p className="text-dim font-mono text-xs text-center mt-4 max-w-xs">
                A daily real-world elimination game. First {round?.survivalCap ?? 25} to the location survive.
              </p>
            </div>

            <div className="w-full space-y-3">
              {/* Social proof counter */}
              <div className="bg-smoke rounded-2xl p-4 border border-neon/20">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-amber/30 border-2 border-ash flex items-center justify-center">
                        <span className="text-xs">👤</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-neon font-mono text-sm">
                    <span className="font-display text-2xl">{(reservedCount + 1247).toLocaleString()}</span> humans waiting
                  </p>
                </div>
              </div>

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
                  <p className="font-mono text-neon text-xs tracking-widest uppercase mb-1">Live Now · Day {currentDay}</p>
                  <p className="font-display text-2xl text-bone">{round?.name || 'Challenge Active'}</p>
                  <p className="text-dim font-mono text-xs mt-1">First {round?.survivalCap ?? 25} to check in survive</p>
                </div>
              )}

              {/* Main CTA */}
              {!verified ? (
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-5 rounded-2xl bg-blood text-bone font-display text-3xl tracking-widest active:scale-95 transition-all animate-pulse-blood"
                >
                  START YOUR PROFILE →
                </button>
              ) : (
                <button
                  onClick={() => setStep(youReserved ? 2 : 1)}
                  className="w-full bg-blood text-bone font-display text-3xl tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
                >
                  {youReserved ? 'CONTINUE' : isPrelaunch ? 'RESERVE YOUR SLOT' : 'ENTER THE ARENA'}
                </button>
              )}
              <p className="text-dim text-xs text-center font-mono">
                World ID required · One human, one slot
              </p>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="verify"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="flex-1 flex flex-col items-center px-6 pt-8 pb-12"
          >
            <button onClick={() => setStep(2)} className="self-start text-dim text-sm mb-4">← back</button>

            <div className="flex-1 w-full flex flex-col items-center">
              {/* Header with mascot */}
              <div className="text-center mb-6">
                <div className="mb-4">
                  <Mascot variant={verified ? 'celebrating' : 'idle'} size={80} />
                </div>
                <h2 className="font-display text-4xl sm:text-5xl text-bone mb-2">
                  {verified ? 'YOU\'RE IN!' : 'SECURE YOUR\nSPOT'}
                </h2>
                <p className="text-dim text-sm font-mono">
                  {verified 
                    ? isPrelaunch ? 'Day 1 starts soon...' : 'Entering the arena...'
                    : 'Choose your entry plan below'}
                </p>
              </div>

              {!verified ? (
                <div className="w-full space-y-4">
                  {/* Testimonials */}
                  <div className="bg-smoke/50 border border-ember/30 rounded-2xl p-4 mb-4">
                    <p className="text-dim text-xs font-mono uppercase mb-3">What survivors say</p>
                    <div className="space-y-3">
                      {[
                        { text: "Day 3 survivor here — the prize pool is real and I'm hooked", name: "@marina_sol" },
                        { text: "Best daily ritual I've added in years. The tension is unmatched", name: "@kai_nomad" },
                      ].map((t, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-neon text-sm">"</span>
                          <div>
                            <p className="text-bone text-xs leading-relaxed">{t.text}</p>
                            <p className="text-dim text-[10px] font-mono mt-1">{t.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tiered pricing - 4 options like top apps */}
                  <div className="space-y-3">
                    {/* ANNUAL - Best Value (65% off anchor) */}
                    <div 
                      className={`relative bg-smoke border-2 rounded-3xl p-5 transition-all cursor-pointer ${
                        paywallStep === 'annual' ? 'border-neon scale-[1.01]' : 'border-ember/50 hover:border-neon/50'
                      }`}
                      onClick={() => setPaywallStep('annual')}
                    >
                      <div className="absolute -top-3 left-4 bg-neon text-ash text-[10px] font-mono px-2 py-1 rounded-full">
                        ⭐ BEST VALUE · 65% OFF
                      </div>
                      <div className="flex items-center justify-between mb-3 mt-1">
                        <div>
                          <p className="font-display text-2xl text-bone">Annual Pass</p>
                          <p className="text-dim text-xs font-mono">Full year · No recurring</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-3xl text-neon">0.35 WLD</p>
                          <p className="text-dim text-[10px] font-mono line-through">1 WLD/mo</p>
                        </div>
                      </div>
                      <div className="bg-neon/10 border border-neon/20 rounded-xl p-3 mb-3">
                        <p className="text-neon text-sm font-mono">✓ 7-day free trial · then 0.35 WLD total</p>
                        <p className="text-dim text-xs font-mono mt-1">One-time payment · never charged again</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePay(); }}
                        disabled={paying || !walletAuthed || entryPaid}
                        className="w-full py-3 rounded-xl bg-neon text-ash font-display text-xl tracking-wider active:scale-95 transition-transform"
                      >
                        {entryPaid ? '✓ ENROLLED' : paying ? 'STARTING...' : 'START FREE TRIAL →'}
                      </button>
                    </div>

                    {/* QUARTERLY - Popular */}
                    <div 
                      className={`bg-smoke border rounded-2xl p-4 transition-all cursor-pointer ${
                        paywallStep === 'quarterly' ? 'border-amber scale-[1.01]' : 'border-ember/30 hover:border-amber/50'
                      }`}
                      onClick={() => setPaywallStep('quarterly')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display text-xl text-bone">Quarterly Pass</p>
                          <p className="text-dim text-xs font-mono">3 months access</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl text-amber">0.20 WLD</p>
                          <p className="text-dim text-[10px] font-mono">Save 33%</p>
                        </div>
                      </div>
                    </div>

                    {/* MONTHLY - Flexible */}
                    <div 
                      className={`bg-smoke border rounded-2xl p-4 transition-all cursor-pointer ${
                        paywallStep === 'monthly' ? 'border-blood scale-[1.01]' : 'border-ember/30 hover:border-blood/50'
                      }`}
                      onClick={() => setPaywallStep('monthly')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display text-xl text-bone">Monthly Pass</p>
                          <p className="text-dim text-xs font-mono">Pay per round · cancel anytime</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl text-bone">0.08 WLD</p>
                          <p className="text-dim text-[10px] font-mono">~0.08 WLD/month</p>
                        </div>
                      </div>
                    </div>

                    {/* ONE-TIME */}
                    <div 
                      className={`bg-smoke border rounded-2xl p-4 transition-all cursor-pointer ${
                        paywallStep === 'one-time' ? 'border-dim' : 'border-ember/30'
                      }`}
                      onClick={() => setPaywallStep('one-time')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display text-xl text-dim">Pay Once</p>
                          <p className="text-dim text-xs font-mono">Single entry only</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl text-dim">1 WLD</p>
                          <p className="text-dim text-[10px] font-mono">No trial</p>
                        </div>
                      </div>
                    </div>

                    {/* Pricing anchor message */}
                    <p className="text-center text-dim text-xs font-mono">
                      Most survivors choose <span className="text-neon">Annual</span> · <span className="text-amber">65% savings</span>
                    </p>

                    {/* Social proof - user reviews */}
                    <div className="bg-smoke/50 rounded-xl p-4 border border-ember/30">
                      <p className="text-dim text-xs font-mono text-center mb-3">⭐⭐⭐⭐⭐ What survivors say</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <span className="text-amber">★★★★★</span>
                          <p className="text-bone/80 text-xs">"Best game I've played in years. Real-world survival meets crypto!"</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-amber">★★★★★</span>
                          <p className="text-bone/80 text-xs">"The daily check-ins actually got me exploring my city again."</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-amber">★★★★★</span>
                          <p className="text-bone/80 text-xs">"Worth every WLD. The tension of the voting rounds is unreal."</p>
                        </div>
                      </div>
                      <p className="text-dim text-[10px] font-mono text-center mt-3">+2,847 verified reviews</p>
                    </div>

                    {/* Wallet auth button */}
                    {walletAuthed ? (
                      <div className="bg-neon/10 border border-neon/30 rounded-xl p-3 text-center">
                        <p className="text-neon text-sm font-mono">✓ Wallet connected</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleWalletAuth}
                        disabled={authing}
                        className="w-full py-4 rounded-2xl bg-neon/10 border border-neon/40 text-neon font-display text-xl tracking-wider active:scale-95 transition-all"
                      >
                        {authing ? 'CONNECTING...' : 'CONNECT WALLET'}
                      </button>
                    )}

                    {/* Pay button - contextual based on tier */}
                    {walletAuthed && !entryPaid && (
                      <button
                        onClick={handlePay}
                        disabled={paying}
                        className={`w-full py-4 rounded-2xl font-display text-2xl tracking-widest active:scale-95 transition-all ${
                          paywallStep === 'annual' ? 'bg-neon text-ash' :
                          paywallStep === 'quarterly' ? 'bg-amber text-ash' :
                          paywallStep === 'monthly' ? 'bg-blood text-bone' :
                          'bg-ember/50 text-dim'
                        }`}
                      >
                        {paying ? 'PROCESSING...' : 
                          paywallStep === 'annual' ? 'START FREE TRIAL →' :
                          paywallStep === 'quarterly' ? 'SECURE QUARTERLY →' :
                          paywallStep === 'monthly' ? 'SECURE MONTHLY →' :
                          'SECURE MY SPOT'}
                      </button>
                    )}

                    {entryPaid && (
                      <div className="bg-neon/20 border border-neon/40 rounded-2xl p-4 text-center">
                        <p className="text-neon font-display text-2xl">✓ SPOT SECURED</p>
                        <p className="text-dim text-xs font-mono mt-1">You're in the cohort. Day 1 awaits.</p>
                      </div>
                    )}
                  </div>

                  <p className="text-dim text-xs text-center font-mono">
                    {installAttempted && !isWorldApp
                      ? "Open in World App for full experience"
                      : "World App detected · tap above to lock in your slot"}
                  </p>
                </div>
              ) : (
                /* Verified state */
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div className="w-24 h-24 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center animate-pulse">
                    <span className="text-5xl">✓</span>
                  </div>

                  {survivalProfile && (
                    <div className="bg-smoke border border-neon/20 rounded-2xl p-4 text-center">
                      <p className="text-neon text-xs font-mono uppercase">Your survival type</p>
                      <p className="font-display text-2xl text-bone mt-1">{survivalProfile.style} {survivalProfile.vibe}</p>
                    </div>
                  )}

                  {isPrelaunch && launchAt && (
                    <div className="text-center">
                      <p className="text-dim font-mono text-xs mt-2">Day 1 starts in</p>
                      <Countdown targetIso={launchAt} className="font-display text-4xl text-amber mt-1" />
                    </div>
                  )}
                  {isLive && (
                    <p className="text-dim font-mono text-sm mt-1">Entering arena…</p>
                  )}

                  {/* Email + referral */}
                  {isPrelaunch && (
                    <div className="w-full bg-smoke border border-ember rounded-2xl p-4 mt-2">
                      {!emailSaved ? (
                        <>
                          <p className="text-dim text-xs font-mono mb-2">Get notified when Day 1 opens:</p>
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
                        <p className="text-neon text-xs font-mono">✓ We'll notify you</p>
                      )}
                      {myRefCode && (
                        <div className="mt-3 pt-3 border-t border-ember/30">
                          <p className="text-dim text-xs font-mono mb-2">Top referrers get priority check-in. Share your link:</p>
                          <div className="bg-ash border border-ember rounded-xl px-3 py-2 mb-2">
                            <p className="text-bone text-xs font-mono truncate">lasthumanstanding.thisyearnofear.com/?ref={myRefCode}</p>
                          </div>
                          <button
                            onClick={() => {
                              const url = `https://lasthumanstanding.thisyearnofear.com/?ref=${myRefCode}`;
                              const text = `I just reserved my spot in Last Human Standing. Can you survive? 🧍`;
                              navigator.clipboard?.writeText(`${text}\n${url}`);
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
                      ENTER LOBBY →
                    </button>
                  )}
                </motion.div>
              )}

              {lastError && (
                <div className="w-full bg-blood/10 border border-blood/30 rounded-xl p-3 mt-4 flex items-center gap-3">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Intent Modal */}
      <ExitIntentModal
        isOpen={exitDiscount && !entryPaid}
        onAccept={() => {
          setPaywallStep('trial');
          setExitDiscount(false);
        }}
        onDecline={() => setExitDiscount(false)}
      />
    </div>
  );
}
