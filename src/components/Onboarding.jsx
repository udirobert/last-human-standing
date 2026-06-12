import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import Countdown from "./Countdown.jsx";
import Mascot from "./Mascot.jsx";
import TrustBadge from "./TrustBadge.jsx";
import WorldIdVerify from "../world/WorldIdVerify.jsx";
import SelfVerify from "./SelfVerify.jsx";
import BrowserWalletPay from "../wallet/BrowserWalletPay.jsx";
import PushOptIn from "./PushOptIn.jsx";
import { ENTRY_FEE_WLD } from "../config/humanityProviders.js";
import { useTrustTier } from "../hooks/useTrustTier.js";

const ONBOARDING_KEY = "lhs_onboarding_v2_done";

const RULES = [
  { n: "01", title: "ONE HUMAN, ONE SLOT", body: "World ID or verified wallet. No bots.", icon: "🫂" },
  { n: "02", title: "DAILY THEME", body: "Find the place type anywhere on Earth. Race for survival slots.", icon: "🌍" },
  { n: "03", title: "PROVE IT", body: "Photo + crowd vote HUMAN or SUS. Optional GPS for credibility.", icon: "📸" },
  { n: "04", title: "LAST ONE WINS", body: "Cap shrinks daily until one human takes the on-chain pot.", icon: "🏆" },
];

export default function Onboarding({ onEnter }) {
  const {
    isWorldApp,
    isFarcaster,
    walletAuthed,
    entryPaid,
    lastError,
    walletAuth,
    payEntryFee,
    markBrowserPaid,
    prizePoolAddress,
    farcasterUser,
  } = useWorld();
  const { tier } = useTrustTier();
  const { phase, launchAt, cohortSize, reservedCount, round, you, isLive } = useRound();

  const [step, setStep] = useState(() => {
    try {
      if (localStorage.getItem(ONBOARDING_KEY) === "1") return 2;
    } catch { /* ignore */ }
    return 0;
  });
  const [authing, setAuthing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [mascotName, setMascotName] = useState(() => {
    try { return localStorage.getItem("lhs_mascot_name") || ""; } catch { return ""; }
  });
  const enteredRef = useRef(false);

  const verified = walletAuthed && entryPaid;
  const youReserved = Boolean(you?.isPaid) || entryPaid;
  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  const [referredBy] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("ref") || null; } catch { return null; }
  });

  useEffect(() => {
    if (!verified || enteredRef.current) return;
    if (!isLive && phase === "prelaunch" && youReserved) return;
    if (!isLive) return;
    enteredRef.current = true;
    const t = setTimeout(() => onEnter(), 600);
    return () => clearTimeout(t);
  }, [verified, isLive, phase, youReserved, onEnter]);

  const markOnboardingDone = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* ignore */ }
  };

  const handleWalletAuth = async () => {
    if (authing || walletAuthed) return;
    setAuthing(true);
    try { await walletAuth(); } finally { setAuthing(false); }
  };

  const handlePay = async () => {
    if (paying || entryPaid) return;
    setPaying(true);
    try {
      await payEntryFee({
        amountWld: ENTRY_FEE_WLD,
        description: `Last Human Standing — ${ENTRY_FEE_WLD} WLD cohort entry`,
        referredBy,
      });
      markOnboardingDone();
    } finally { setPaying(false); }
  };

  const stepLabels = ["Welcome", "Rules", "Reserve", "Done"];

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body overflow-hidden">
      <div className="flex items-center justify-center gap-2 pt-4 px-4">
        {stepLabels.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={i > step}
            onClick={() => i < step && setStep(i)}
            className={`flex items-center gap-1 ${i <= step ? "opacity-100" : "opacity-30"}`}
          >
            <div className={`w-2 h-2 rounded-full ${i === step ? "bg-blood scale-125" : i < step ? "bg-neon" : "bg-ember"}`} />
            <span className="font-mono text-[10px] text-dim hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-between px-6 pt-8 pb-10"
          >
            <div className="flex flex-col items-center text-center">
              <Mascot variant="excited" size={90} />
              <h1 className="font-display text-5xl text-bone mt-6 leading-none tracking-wider animate-glow">
                LAST<br />HUMAN<br />STANDING
              </h1>
              <p className="text-dim font-mono text-xs mt-4 max-w-xs">
                Daily real-world elimination. Photo proof + crowd audit. One human wins the pot.
              </p>
              <div className="mt-4">
                <TrustBadge size="md" />
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="bg-smoke rounded-2xl p-4 border border-ember">
                <p className="font-mono text-dim text-xs uppercase mb-1">Cohort #1</p>
                <p className="font-display text-3xl text-bone">{reservedCount.toLocaleString()}<span className="text-dim text-lg"> / {cohortSize}</span></p>
                <div className="mt-2 h-1.5 bg-ember rounded-full overflow-hidden">
                  <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${cohortPct}%` }} />
                </div>
                {launchAt && phase === "prelaunch" && (
                  <p className="text-amber font-mono text-xs mt-2">Day 1 in <Countdown targetIso={launchAt} className="inline" /></p>
                )}
              </div>

              {!isWorldApp && !isFarcaster && (
                <p className="text-amber/90 text-xs font-mono text-center">
                  Browser mode: connect wallet + verify humanity for full trust. Demo feed uses sample data until live.
                </p>
              )}

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-5 rounded-2xl bg-blood text-bone font-display text-3xl tracking-widest active:scale-95 transition-transform"
              >
                CONTINUE →
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex-1 flex flex-col px-6 pt-6 pb-8"
          >
            <button type="button" onClick={() => setStep(0)} className="text-dim text-sm mb-4 text-left">← back</button>
            <h2 className="font-display text-4xl text-bone mb-2">THE RULES</h2>
            <p className="text-dim text-sm font-mono mb-4">Four steps. No fine print.</p>

            <div className="space-y-3 flex-1 overflow-auto">
              {RULES.map((rule) => (
                <div key={rule.n} className="flex gap-3 bg-smoke rounded-2xl p-4 border border-ember/50">
                  <span className="text-2xl">{rule.icon}</span>
                  <div>
                    <p className="font-display text-lg text-bone">{rule.title}</p>
                    <p className="text-dim text-xs mt-1">{rule.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPersonalize(!showPersonalize)}
              className="text-dim text-xs font-mono underline mb-3 text-left"
            >
              {showPersonalize ? "Hide" : "Optional: personalize your guide"}
            </button>
            {showPersonalize && (
              <input
                type="text"
                value={mascotName}
                onChange={(e) => setMascotName(e.target.value)}
                onBlur={() => mascotName && localStorage.setItem("lhs_mascot_name", mascotName)}
                placeholder="Your name (optional)"
                className="w-full mb-3 bg-smoke border border-ember rounded-xl px-4 py-3 text-bone font-mono text-sm"
                maxLength={20}
              />
            )}

            <button
              type="button"
              onClick={() => { markOnboardingDone(); setStep(2); }}
              className="w-full py-4 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95 transition-transform"
            >
              RESERVE MY SLOT →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="reserve"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex-1 flex flex-col px-6 pt-6 pb-8"
          >
            <button type="button" onClick={() => setStep(1)} className="text-dim text-sm mb-4 text-left">← back</button>

            <Mascot variant={entryPaid ? "celebrating" : "excited"} size={64} />
            <h2 className="font-display text-4xl text-bone mt-4 mb-1">
              {entryPaid ? "SPOT SECURED" : `RESERVE · ${ENTRY_FEE_WLD} WLD`}
            </h2>
            <p className="text-dim text-sm font-mono mb-4">
              Entry fee goes to the on-chain prize pool. One payment, one slot.
            </p>
            <TrustBadge size="md" className="mb-4" />

            <div className="bg-smoke border border-neon/30 rounded-2xl p-4 mb-4 space-y-3">
              <p className="font-mono text-neon text-xs uppercase">Trust levels</p>
              <ul className="text-dim text-xs font-mono space-y-2 list-disc pl-4">
                <li><span className="text-amber">Provisional</span> — paid, not yet verified (can play, limited voting if configured)</li>
                <li><span className="text-neon">Verified human</span> — World ID or Self Protocol (Celo)</li>
              </ul>
            </div>

            {!entryPaid && (
              <div className="bg-smoke border border-ember rounded-2xl p-5 mb-4">
                {import.meta.env.VITE_FREE_ENTRY_MODE === "true" ? (
                  <>
                    <p className="font-display text-3xl text-neon mb-1">FREE ENTRY</p>
                    <p className="text-dim text-xs font-mono mb-4">Hackathon campaign — no payment required</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const resp = await fetch("/api/pay/free-entry", { method: "POST", credentials: "include" });
                          if (!resp.ok) throw new Error("free_entry_failed");
                          markBrowserPaid();
                          markOnboardingDone();
                        } catch { /* silent */ }
                      }}
                      className="w-full py-4 rounded-2xl bg-neon text-ash font-display text-2xl tracking-widest active:scale-95"
                    >
                      JOIN FREE →
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-display text-3xl text-amber mb-1">{ENTRY_FEE_WLD} WLD</p>
                    <p className="text-dim text-xs font-mono mb-4">Single entry · grows the prize pool</p>

                    {isWorldApp ? (
                      <>
                        {!walletAuthed ? (
                          <button
                            type="button"
                            onClick={handleWalletAuth}
                            disabled={authing}
                            className="w-full py-4 rounded-2xl bg-neon/10 border border-neon/40 text-neon font-display text-xl mb-3 active:scale-95"
                          >
                            {authing ? "CONNECTING…" : "CONNECT WALLET"}
                          </button>
                        ) : (
                          <p className="text-neon font-mono text-xs text-center mb-3">✓ Wallet connected</p>
                        )}
                        {walletAuthed && (
                          <button
                            type="button"
                            onClick={handlePay}
                            disabled={paying}
                            className="w-full py-4 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95 disabled:opacity-50"
                          >
                            {paying ? "PROCESSING…" : `PAY ${ENTRY_FEE_WLD} WLD →`}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <BrowserWalletPay
                          prizePoolAddress={prizePoolAddress}
                          referredBy={referredBy}
                          onPaid={(addr) => {
                            markBrowserPaid(addr);
                            markOnboardingDone();
                          }}
                        />
                        <div className="mt-4 pt-3 border-t border-ember/30">
                          <button
                            type="button"
                            onClick={() => { markOnboardingDone(); onEnter(); }}
                            className="w-full py-3 rounded-xl bg-ash border border-ember/50 text-dim font-mono text-sm hover:text-bone hover:border-ember active:scale-95 transition-all"
                          >
                            See how it works (no payment required)
                          </button>
                          <p className="text-dim/70 text-[10px] font-mono text-center mt-1.5">
                            Browse the feed and leaderboard as an observer
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {!isFarcaster && entryPaid && tier !== "verified" && (
              <div className="mb-4 space-y-3">
                <p className="text-dim text-xs font-mono mb-2">Upgrade to verified human (recommended before Day 1):</p>
                {import.meta.env.VITE_ENABLE_IDKIT === "true" && <WorldIdVerify />}
                <SelfVerify />
              </div>
            )}

            {entryPaid && (
              <button
                type="button"
                onClick={() => { markOnboardingDone(); setStep(3); }}
                className="w-full py-4 rounded-2xl bg-neon text-ash font-display text-2xl tracking-widest active:scale-95"
              >
                CONTINUE →
              </button>
            )}

            {lastError && (
              <p className="text-blood text-xs font-mono mt-3 text-center">{lastError}</p>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center"
          >
            <Mascot variant="celebrating" size={80} />
            <h2 className="font-display text-4xl text-bone mt-6">YOU&apos;RE IN</h2>
            <TrustBadge size="md" className="mt-3" />
            <div className="w-full mt-4 px-2">
              <PushOptIn />
            </div>
            {phase === "prelaunch" && launchAt && (
              <p className="text-dim font-mono text-sm mt-4">Day 1 starts in <Countdown targetIso={launchAt} className="text-amber" /></p>
            )}
            <p className="text-dim text-xs font-mono mt-2 max-w-xs">
              First {round?.survivalCap ?? 25} check-ins survive each day. Watch the mission board when live.
            </p>
            <button
              type="button"
              onClick={() => { markOnboardingDone(); onEnter(); }}
              className="w-full mt-8 py-4 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95"
            >
              {isLive ? "ENTER ARENA →" : "ENTER LOBBY →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
