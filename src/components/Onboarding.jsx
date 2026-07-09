import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import Countdown from "./Countdown.jsx";
import Mascot from "./Mascot.jsx";
import TrustBadge from "./TrustBadge.jsx";
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
import LandingHero from "./ui/LandingHero.jsx";
import DailyProofs from "./ui/DailyProofs.jsx";
import ShrinkingPot from "./ui/ShrinkingPot.jsx";

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
  const [showDetails, setShowDetails] = useState(false);
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

  // Step 0 is the full-bleed cinematic landing; it breaks out of the 430px
  // game shell (see index.css body.landing-mode). Other steps stay phone-width.
  useEffect(() => {
    document.body.classList.toggle("landing-mode", step === 0);
    document.documentElement.classList.toggle("landing-mode", step === 0);
    return () => {
      document.body.classList.remove("landing-mode");
      document.documentElement.classList.remove("landing-mode");
    };
  }, [step]);

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
    <div className="onboarding-shell min-h-screen bg-ash flex flex-col font-body overflow-hidden">
      {/* Minimal progress bar — 4 segments, no labels. Hidden on step 0: the
          cinematic landing is the trailer before the step flow begins, and
          this cold system-chrome strip has no business poking above it. */}
      {step !== 0 && (
        <div className="flex items-center justify-center gap-1.5 pt-3 px-4">
          {stepLabels.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300 ease-out"
              style={{
                width: i === step ? "24px" : "12px",
                backgroundColor: i <= step ? "rgb(var(--color-blood))" : "rgb(var(--color-ember))",
                opacity: i <= step ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            className="w-full max-w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Full-bleed cinematic hero — the trailer (docs/ART_DIRECTION.md). */}
            <LandingHero
              targetIso={launchAt}
              reservedCount={reservedCount}
              cohortSize={cohortSize}
              onReserve={() => setStep(1)}
              onDetails={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
            />

            {/* The daily-theme wheel — the game's premise, shown in paint. */}
            <div id="daily-proofs" className="pt-8 pb-4">
              <DailyProofs />
            </div>

            {/* How it works — the day's four beats. */}
            <section id="how-it-works" className="max-w-[560px] mx-auto px-5 pt-6 pb-10">
              <p className="font-display text-3xl text-bone text-center tracking-wide mb-5">HOW IT WORKS</p>
              <DayTimeline />
            </section>

            {/* The stakes — 50 → 1, and the pot. */}
            <div className="pb-10">
              <ShrinkingPot prizePool={pot} />
            </div>

            {/* On-chain detail + live proof + reserve. */}
            <section className="max-w-[560px] mx-auto px-5 pb-20 space-y-3">
              <div className="bg-smoke/40 rounded-2xl p-4 border border-ember/30">
                <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2 text-center">
                  The pot, on-chain
                </p>
                <PrizePots prizePool={pot} />
              </div>

              <CohortTicker pollMs={15000} />

              <motion.button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-5 rounded-2xl bg-amber text-[#1a1206] font-body font-semibold text-lg active:scale-[0.97] transition-transform shadow-[0_10px_30px_-8px_rgba(255,184,0,0.5)]"
              >
                Reserve your slot →
              </motion.button>

              <div className="flex justify-center pt-1">
                <TrustBadge size="sm" />
              </div>
            </section>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, transform: "translateX(16px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateX(0) scale(1)" }}
            exit={{ opacity: 0, transform: "translateX(-16px) scale(0.98)" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="flex-1 flex flex-col"
          >
            <StageShell
              onBack={() => setStep(0)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} />}
            >
              <StageSection index={0} className="text-center">
                <Mascot variant="idle" size={64} />
                <h2 className="font-display text-4xl text-bone mb-1 mt-2">THE RULES</h2>
                <p className="text-dim text-sm font-mono">Four steps. That's it.</p>
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
                  className="w-full py-4 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-[0.97] transition-transform shadow-[0_0_24px_rgba(255,26,26,0.3)]"
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
            initial={{ opacity: 0, transform: "translateX(16px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateX(0) scale(1)" }}
            exit={{ opacity: 0, transform: "translateX(-16px) scale(0.98)" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="flex-1 flex flex-col"
          >
            <StageShell
              onBack={() => setStep(1)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} />}
            >
              <StageSection index={0} className="flex flex-col items-center text-center pt-2">
                <Mascot variant={entryPaid ? "celebrating" : "excited"} size={80} />
                {(() => {
                  const heading = getEntryHeading({ isFreeMode: isFree, alreadyPaid: entryPaid });
                  return (
                    <>
                      <h2 className="font-display text-4xl text-bone mt-4 mb-1">{heading.title}</h2>
                      <p className="text-dim text-sm font-mono mb-2">{heading.sub}</p>
                    </>
                  );
                })()}
                <TrustBadge size="md" className="mb-2" />
              </StageSection>

              <div className="mt-3 space-y-3 flex-1">
                {!entryPaid && (
                  <>
                    {/* Prize reminder */}
                    {pot && (
                      <StageSection index={2} className="bg-smoke/60 rounded-2xl p-3 border border-amber/30">
                        <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-1.5 text-center">🏆 The pot</p>
                        <PrizePots prizePool={pot} />
                      </StageSection>
                    )}

                    {/* PAID CARD */}
                    <StageSection index={3} className="bg-smoke border border-ember rounded-2xl p-4">
                      <div className="flex items-baseline justify-between mb-3">
                        <p className="font-display text-2xl text-amber">{ENTRY.paid.title}</p>
                        <p className="font-mono text-[10px] text-dim uppercase">{ENTRY.paid.cardLabel}</p>
                      </div>
                      <p className="text-dim text-xs font-mono mb-3">{ENTRY.paid.blurb}</p>

                      {isWorldApp ? (
                        <>
                          {!walletAuthed ? (
                            <button
                              type="button"
                              onClick={handleWalletAuth}
                              disabled={authing}
                              className="w-full py-3.5 rounded-xl bg-neon/10 border border-neon/40 text-neon font-display text-lg mb-2 active:scale-[0.97] transition-transform"
                            >
                              {authing ? "CONNECTING…" : "CONNECT WALLET"}
                            </button>
                          ) : (
                            <p className="text-neon font-mono text-xs text-center mb-2">✓ Connected</p>
                          )}
                          {walletAuthed && (
                            <button
                              type="button"
                              onClick={handlePay}
                              disabled={paying}
                              className="w-full py-3.5 rounded-xl bg-blood text-bone font-display text-xl tracking-widest active:scale-[0.97] disabled:opacity-50 transition-transform"
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
                    </StageSection>

                    {/* FREE CARD */}
                    {isFree && (
                      <StageSection index={4} className="bg-smoke border border-neon/30 rounded-2xl p-4">
                        <div className="flex items-baseline justify-between mb-3">
                          <p className="font-display text-2xl text-neon">{ENTRY.free.title}</p>
                          <p className="font-mono text-[10px] text-dim uppercase">{ENTRY.free.cardLabel}</p>
                        </div>
                        <p className="text-dim text-xs font-mono mb-3">{ENTRY.free.blurb}</p>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const resp = await fetch("/api/pay/free-entry", { method: "POST", credentials: "include" });
                              if (!resp.ok) throw new Error(`free_entry_failed_${resp.status}`);
                              const data = await resp.json().catch(() => ({}));
                              markBrowserPaid(data.address);
                              markOnboardingDone();
                            } catch (e) {
                              console.error("free entry failed:", e);
                            }
                          }}
                          className="w-full py-3.5 rounded-xl bg-neon text-ash font-display text-xl tracking-widest active:scale-[0.97] transition-transform"
                        >
                          {ENTRY.free.cta}
                        </button>
                      </StageSection>
                    )}

                    {/* Observer peek */}
                    {!isWorldApp && (
                      <StageSection index={5}>
                        <button
                          type="button"
                          onClick={() => { markOnboardingDone(); onEnter(); }}
                          className="w-full py-2.5 rounded-xl text-dim font-mono text-sm hover:text-bone active:scale-[0.97] transition-all"
                        >
                          Just looking? Browse the feed →
                        </button>
                      </StageSection>
                    )}
                  </>
                )}

                {entryPaid && (
                  <StageSection index={6}>
                    <button
                      type="button"
                      onClick={() => { markOnboardingDone(); setStep(3); }}
                      className="w-full py-4 rounded-2xl bg-neon text-ash font-display text-2xl tracking-widest active:scale-[0.97] transition-transform"
                    >
                      CONTINUE →
                    </button>
                  </StageSection>
                )}

                {lastError && (
                  <div className="mt-3 rounded-xl border border-blood/30 bg-blood/5 p-3 text-center">
                    <p className="text-blood text-xs font-mono">{lastError}</p>
                    <div className="mt-2 flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="px-3 py-1.5 rounded-lg bg-smoke border border-ember text-bone font-mono text-[11px] active:scale-95 transition-transform"
                      >
                        ← TRY AGAIN
                      </button>
                      {entryPaid && (
                        <button
                          type="button"
                          onClick={() => { markOnboardingDone(); setStep(3); }}
                          className="px-3 py-1.5 rounded-lg bg-ember text-bone font-mono text-[11px] active:scale-95 transition-transform"
                        >
                          SKIP FOR NOW →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </StageShell>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
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

                {/* Verification power-up — reframed as a benefit, not a gate */}
                {tier !== "verified" && (
                  <StageSection index={2} className="bg-smoke/70 rounded-2xl p-4 border border-neon/30 backdrop-blur-sm">
                    <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-1">
                      ⚡ Power-up: Verify your humanity
                    </p>
                    <p className="text-dim text-[11px] font-mono mb-3 leading-relaxed">
                      Verified humans get <span className="text-neon">×2 voting power</span> as jury members and priority for cohort 2. Takes 30 seconds.
                    </p>
                    {!isFarcaster && import.meta.env.VITE_ENABLE_IDKIT === "true" && <WorldIdVerify />}
                    {import.meta.env.VITE_ENABLE_SELF === "true" && (
                      <div className={!isFarcaster && import.meta.env.VITE_ENABLE_IDKIT === "true" ? "mt-2" : ""}>
                        <Suspense fallback={<ScreenLoader kind="detail" />}>
                          <SelfVerify />
                        </Suspense>
                      </div>
                    )}
                    {!isFarcaster && !import.meta.env.VITE_ENABLE_IDKIT && !import.meta.env.VITE_ENABLE_SELF && (
                      <p className="text-dim text-[10px] font-mono text-center">
                        Verification offline in this build.
                      </p>
                    )}
                  </StageSection>
                )}

                {/* Practice vote — teaches the mechanic before real voting */}
                <StageSection index={3} className="bg-smoke/70 rounded-2xl p-4 border border-ember/40 backdrop-blur-sm">
                  <PracticeVote />
                </StageSection>

                {phase === "prelaunch" && launchAt && (
                  <StageSection index={4} className="bg-smoke/70 rounded-2xl p-3 border border-ember/40 backdrop-blur-sm">
                    <LaunchCountdown targetIso={launchAt} />
                  </StageSection>
                )}

                <StageSection index={5} className="text-center">
                  <p className="text-dim text-xs font-mono max-w-xs mx-auto">
                    Share your link, check the leaderboard, and wait for Day 1.
                  </p>
                </StageSection>

                <StageSection index={6}>
                  <button
                    type="button"
                    onClick={() => { markOnboardingDone(); onEnter(); }}
                    className="w-full py-5 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-[0.97] transition-transform shadow-[0_0_32px_rgba(255,26,26,0.4)]"
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

/**
 * PracticeVote — a sample submission that teaches the HUMAN/SUS voting
 * mechanic before the player encounters real submissions. Shows one
 * example, lets them vote, then reveals the answer with explanation.
 */
function PracticeVote() {
  const [vote, setVote] = useState(null);
  const [revealed, setRevealed] = useState(false);

  // Sample: a real café photo with GPS and a specific caption
  const sample = {
    caption: "Flat white at my local in Lisbon. Day 1 lets go ☕",
    location: "Lisbon, Portugal",
    gpsShared: true,
    mediaUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop",
    answer: "real",
    explanation: "This was voted HUMAN. Real location, GPS shared, specific caption with city name. These are the signals voters look for.",
  };

  const handleVote = (v) => {
    if (revealed) return;
    setVote(v);
    setRevealed(true);
  };

  const correct = vote === sample.answer;

  return (
    <div>
      <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2 text-center">
        🔍 Practice vote
      </p>
      <p className="text-dim text-[10px] font-mono mb-3 text-center">
        Try it — vote HUMAN or SUS. No stakes, just learning.
      </p>

      {/* Sample submission */}
      <div className="bg-ash/60 rounded-xl overflow-hidden border border-ember/30">
        <img
          src={sample.mediaUrl}
          alt="Café submission"
          className="w-full h-40 object-cover"
          loading="lazy"
        />
        <div className="p-3">
          <p className="text-bone font-mono text-xs mb-1">{sample.caption}</p>
          <p className="text-dim font-mono text-[10px]">
            📍 {sample.location} {sample.gpsShared && "· GPS ✓"}
          </p>
        </div>
      </div>

      {/* Vote buttons or reveal */}
      {!revealed ? (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => handleVote("real")}
            className="py-2.5 rounded-xl bg-neon/10 border border-neon/40 text-neon font-mono text-xs font-bold tracking-wide active:scale-95 transition-transform"
          >
            🧍 HUMAN
          </button>
          <button
            onClick={() => handleVote("fake")}
            className="py-2.5 rounded-xl bg-blood/10 border border-blood/40 text-blood font-mono text-xs font-bold tracking-wide active:scale-95 transition-transform"
          >
            🚫 SUS
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-2"
        >
          <div className={`rounded-xl p-3 text-center border ${
            correct ? "bg-neon/10 border-neon/40" : "bg-blood/10 border-blood/40"
          }`}>
            <p className={`font-display text-sm ${correct ? "text-neon" : "text-blood"}`}>
              {correct ? "✓ Correct!" : "✗ Not quite"}
            </p>
            <p className="text-dim text-[10px] font-mono mt-1 leading-relaxed">
              {sample.explanation}
            </p>
          </div>
          <button
            onClick={() => { setVote(null); setRevealed(false); }}
            className="w-full py-2 rounded-lg bg-smoke border border-ember text-dim font-mono text-[10px] active:scale-95 transition-transform"
          >
            ↻ Try again
          </button>
        </motion.div>
      )}
    </div>
  );
}
