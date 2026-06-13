import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import Countdown from "./Countdown.jsx";
import Mascot from "./Mascot.jsx";
import TrustBadge from "./TrustBadge.jsx";
import DailyPrompt from "./prelaunch/DailyPrompt.jsx";
import EarlyBadge from "./prelaunch/EarlyBadge.jsx";
import WorldIdVerify from "../world/WorldIdVerify.jsx";
const SelfVerify = lazy(() => import("./SelfVerify.jsx"));
import BrowserWalletPay from "../wallet/BrowserWalletPay.jsx";
import PushOptIn from "./PushOptIn.jsx";
import { ENTRY_FEE_WLD } from "../config/humanityProviders.js";
import { useTrustTier } from "../hooks/useTrustTier.js";
import { useEntryMode } from "../hooks/useEntryMode.js";
import ScreenLoader from "./ui/ScreenLoader.jsx";
import { RULES, FAQS, getEntryHeading, ENTRY } from "../lib/copy.js";
import PrizePots from "./prelaunch/PrizePots.jsx";
import DayTimeline from "./DayTimeline.jsx";
import LaunchCountdown from "./LaunchCountdown.jsx";
import FAQModal from "./FAQModal.jsx";
import AmbientBackdrop from "./AmbientBackdrop.jsx";
import StageShell, { StageSection, CohortTicker } from "./StageShell.jsx";
import { RULE_ICON_MAP } from "./RuleIconMap.js";
import StepThreeConfetti from "./StepThreeConfetti.jsx";

const ONBOARDING_KEY = "lhs_onboarding_v2_done";

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
    user,
  } = useWorld();
  const { tier } = useTrustTier();
  const { isFree } = useEntryMode();
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
  const [pot, setPot] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const enteredRef = useRef(false);

  const verified = walletAuthed && entryPaid;
  const youReserved = Boolean(you?.isPaid) || entryPaid;
  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  const [referredBy] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("ref") || null; } catch { return null; }
  });

  // Fetch live prize pot for the welcome screen. Best-effort; tolerates
  // the endpoint being down by leaving pot as null (UI shows "loading…").
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.prizePool) setPot(data.prizePool); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
            className="flex-1 flex flex-col"
          >
            <StageShell
              onBack={null}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} />}
            >
              <StageSection index={0} className="flex flex-col items-center text-center pt-2">
                <Mascot variant="excited" size={120} />
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, type: "spring", damping: 16 }}
                  className="font-display text-5xl text-bone mt-5 leading-none tracking-wider animate-glow"
                >
                  LAST HUMAN<br />STANDING
                </motion.h1>
                <p className="text-bone font-mono text-sm mt-3 max-w-xs leading-relaxed">
                  Be one of 50 humans. Last survivor takes the on-chain pot.
                </p>
              </StageSection>

              <div className="mt-5 space-y-3">
                <StageSection index={1} className="bg-smoke/60 rounded-2xl p-4 border border-ember/40 backdrop-blur-sm">
                  <DayTimeline />
                </StageSection>

                {phase === "prelaunch" && launchAt && (
                  <StageSection index={2} className="bg-smoke/60 rounded-2xl p-4 border border-ember/40 backdrop-blur-sm">
                    <LaunchCountdown targetIso={launchAt} />
                    <div className="mt-3">
                      <p className="font-mono text-dim text-[10px] uppercase tracking-widest text-center mb-1">
                        Cohort 1
                      </p>
                      <p className="font-display text-3xl text-bone text-center tabular-nums">
                        {reservedCount.toLocaleString()}<span className="text-dim text-lg"> / {cohortSize}</span>
                      </p>
                      <div className="mt-2 h-1.5 bg-ember rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cohortPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-amber rounded-full"
                        />
                      </div>
                    </div>
                  </StageSection>
                )}

                <StageSection index={3} className="bg-smoke/40 rounded-2xl p-3 border border-ember/30 backdrop-blur-sm">
                  <PrizePots prizePool={pot} />
                </StageSection>

                <StageSection index={4}>
                  <CohortTicker pollMs={15000} />
                </StageSection>

                <StageSection index={5}>
                  <DailyPrompt />
                </StageSection>

                <StageSection index={6}>
                  <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full py-5 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95 transition-transform shadow-[0_0_24px_rgba(255,26,26,0.3)]"
                  >
                    HOW TO PLAY →
                  </motion.button>
                </StageSection>

                <StageSection index={7} className="flex justify-center">
                  <TrustBadge size="sm" />
                </StageSection>
              </div>
            </StageShell>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex-1 flex flex-col"
          >
            <StageShell
              onBack={() => setStep(0)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} />}
            >
              <StageSection index={0} className="text-center">
                <h2 className="font-display text-4xl text-bone mb-1">THE RULES</h2>
                <p className="text-dim text-sm font-mono">Four steps. No fine print.</p>
              </StageSection>

              <div className="mt-4 space-y-2.5 flex-1">
                {RULES.map((rule, i) => {
                  const Icon = RULE_ICON_MAP[rule.n] || null;
                  return (
                    <StageSection key={rule.n} index={i + 1}>
                      <div className="flex items-center gap-3 bg-smoke/70 rounded-2xl p-3 border border-ember/40 backdrop-blur-sm">
                        {Icon ? <Icon /> : <span className="text-2xl">{rule.icon}</span>}
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-amber text-[10px] tracking-widest">{rule.n}</span>
                            <p className="font-display text-base text-bone leading-tight">{rule.title}</p>
                          </div>
                          <p className="text-dim text-[11px] mt-0.5 leading-snug">{rule.body}</p>
                        </div>
                      </div>
                    </StageSection>
                  );
                })}
              </div>

              <StageSection index={5}>
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
              </StageSection>

              <StageSection index={6}>
                <button
                  type="button"
                  onClick={() => { markOnboardingDone(); setStep(2); }}
                  className="w-full py-4 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95 transition-transform shadow-[0_0_24px_rgba(255,26,26,0.3)]"
                >
                  RESERVE MY SLOT →
                </button>
              </StageSection>
            </StageShell>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="reserve"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex-1 flex flex-col"
          >
            <Mascot variant={entryPaid ? "celebrating" : "excited"} size={64} />
            {(() => {
              const heading = getEntryHeading({ isFreeMode: isFree, alreadyPaid: entryPaid });
              return (
                <>
                  <h2 className="font-display text-4xl text-bone mt-4 mb-1">{heading.title}</h2>
                  <p className="text-dim text-sm font-mono mb-4">{heading.sub}</p>
                </>
              );
            })()}
            <TrustBadge size="md" className="mb-4" />

            <div className="bg-smoke border border-neon/30 rounded-2xl p-4 mb-4 space-y-3">
              <p className="font-mono text-neon text-xs uppercase">Trust tiers</p>
              <ul className="text-dim text-xs font-mono space-y-2 list-disc pl-4">
                <li>
                  <span className="text-amber">Provisional</span> — wallet signed in, not yet verified
                  (can play, can vote when configured)
                </li>
                <li>
                  <span className="text-neon">Verified human</span> — World ID or Self Protocol
                  (full trust, recommended before Day 1)
                </li>
              </ul>
              {tier === "unverified" && (
                <p className="text-dim/80 text-[10px] font-mono">
                  You're currently <span className="text-amber">unverified</span> — sign in and reserve
                  a slot to unlock the Provisional tier.
                </p>
              )}
            </div>

            {!entryPaid && (
              <div className="space-y-3 mb-4">
                {/* PAID CARD — always visible so users can choose to guarantee. */}
                <div className="bg-smoke border border-ember rounded-2xl p-5">
                  <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-1">
                    {ENTRY.paid.cardLabel}
                  </p>
                  <p className="font-display text-3xl text-amber mb-1">{ENTRY.paid.title}</p>
                  <p className="text-dim text-xs font-mono mb-4">{ENTRY.paid.blurb}</p>

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
                    <BrowserWalletPay
                      prizePoolAddress={prizePoolAddress}
                      referredBy={referredBy}
                      onPaid={(addr) => {
                        markBrowserPaid(addr);
                        markOnboardingDone();
                      }}
                    />
                  )}
                </div>

                {/* FREE CARD — only when free mode is on. */}
                {isFree && (
                  <div className="bg-smoke border border-neon/30 rounded-2xl p-5">
                    <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-1">
                      {ENTRY.free.cardLabel}
                    </p>
                    <p className="font-display text-3xl text-neon mb-1">{ENTRY.free.title}</p>
                    <p className="text-dim text-xs font-mono mb-4">{ENTRY.free.blurb}</p>
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
                      {ENTRY.free.cta}
                    </button>
                  </div>
                )}

                {/* Observer peek — no signup. Browser only. */}
                {!isWorldApp && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => { markOnboardingDone(); onEnter(); }}
                      className="w-full py-3 rounded-xl bg-ash border border-ember/50 text-dim font-mono text-sm hover:text-bone hover:border-ember active:scale-95 transition-all"
                    >
                      See how it works (no signup)
                    </button>
                    <p className="text-dim/70 text-[10px] font-mono text-center mt-1.5">
                      Browse the feed and leaderboard as an observer
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isFarcaster && entryPaid && tier !== "verified" && (
              <div className="mb-4 space-y-3">
                <p className="text-dim text-xs font-mono mb-2">Upgrade to verified human (recommended before Day 1):</p>
                {import.meta.env.VITE_ENABLE_IDKIT === "true" && <WorldIdVerify />}
                {import.meta.env.VITE_ENABLE_SELF === "true" && (
                  <Suspense fallback={<ScreenLoader kind="detail" />}>
                    <SelfVerify />
                  </Suspense>
                )}
                {!import.meta.env.VITE_ENABLE_IDKIT && !import.meta.env.VITE_ENABLE_SELF && (
                  <p className="text-dim text-[10px] font-mono text-center">
                    Humanity verification is offline in this build.
                  </p>
                )}
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
            className="flex-1 flex flex-col"
          >
            <StageShell
              onBack={() => setStep(2)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase="live" />}
            >
              {/* Celebration confetti — one-shot on step 3 mount */}
              <StepThreeConfetti />

              <StageSection index={0} className="flex flex-col items-center text-center pt-2">
                <Mascot variant="celebrating" size={120} />
                <motion.h2
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 12 }}
                  className="font-display text-5xl text-bone mt-5 animate-glow"
                >
                  YOU&apos;RE IN
                </motion.h2>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <TrustBadge size="md" />
                  {phase === "prelaunch" && <EarlyBadge size="md" reservedAt={user?.reservedAt} />}
                </div>
              </StageSection>

              <div className="mt-4 space-y-2.5 flex-1">
                <StageSection index={1} className="bg-smoke/70 rounded-2xl p-3 border border-ember/40 backdrop-blur-sm">
                  <PushOptIn />
                </StageSection>

                {phase === "prelaunch" && launchAt && (
                  <StageSection index={2} className="bg-smoke/70 rounded-2xl p-3 border border-ember/40 backdrop-blur-sm">
                    <LaunchCountdown targetIso={launchAt} />
                  </StageSection>
                )}

                <StageSection index={3} className="text-center">
                  <p className="text-dim text-xs font-mono max-w-xs mx-auto">
                    The full prelaunch home — share link, leaderboard, daily prompt — is waiting in the lobby.
                  </p>
                </StageSection>

                <StageSection index={4}>
                  <button
                    type="button"
                    onClick={() => { markOnboardingDone(); onEnter(); }}
                    className="w-full py-5 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95 transition-transform shadow-[0_0_32px_rgba(255,26,26,0.4)]"
                  >
                    {isLive ? "ENTER ARENA →" : "ENTER LOBBY →"}
                  </button>
                </StageSection>
              </div>
            </StageShell>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
