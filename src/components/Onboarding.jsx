import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorld } from "../world/WorldProvider.jsx";
import { useRound } from "../world/RoundProvider.jsx";
import { useDelight } from "./DelightProvider.jsx";
import Mascot from "./Mascot.jsx";
import TrustBadge from "./TrustBadge.jsx";
import WhatsPublicChip from "./WhatsPublicChip.jsx";
import BrowserWalletPay from "../wallet/BrowserWalletPay.jsx";
import { ENTRY_FEE_WLD } from "../config/humanityProviders.js";
import {
  RULES,
  getEntryHeading,
  ENTRY,
  PROFILE_QUESTIONS,
  getPersonalizedPaywall,
  getProfiledMascotLines,
  survivalRule,
} from "../lib/copy.js";
import PrizePots from "./prelaunch/PrizePots.jsx";
import DayTimeline from "./DayTimeline.jsx";
import AmbientBackdrop from "./AmbientBackdrop.jsx";
import StageShell, { StageSection, CohortTicker } from "./StageShell.jsx";
import { RULE_ICON_MAP } from "./RuleIconMap.js";
import LandingHero from "./ui/LandingHero.jsx";
import DailyProofs from "./ui/DailyProofs.jsx";
import MotifFrieze from "./ui/MotifFrieze.jsx";
import ShrinkingPot from "./ui/ShrinkingPot.jsx";
import GameplayLoopDemo from "./ui/GameplayLoopDemo.jsx";
import ExitIntentPrompt from "./ui/ExitIntentPrompt.jsx";
import SharePanel from "./prelaunch/SharePanel.jsx";
import ReachabilitySetup from "./prelaunch/ReachabilitySetup.jsx";
import VerifyOptIn from "./prelaunch/VerifyOptIn.jsx";
import PushOptIn from "./PushOptIn.jsx";
import Countdown from "./Countdown.jsx";
import { markJustReserved, markConfirming, clearConfirming } from "../lib/postReserve.js";
import { CUE_PRESS } from "../lib/cuelume.js";
import { CompactButton, HumanCta } from "./ui/CraftCta.jsx";
import MascotGuide from "./ui/MascotGuide.jsx";
import { MOTION_SPRING } from "../lib/motion.js";
import { track } from "../lib/track.js";

const ONBOARDING_KEY = "lhs_onboarding_v2_done";

export default function Onboarding({ onEnter, onSpeedRun }) {
  const {
    isWorldApp,
    isFarcaster,
    farcasterUser,
    walletAuthed,
    entryPaid,
    lastError,
    walletAuth,
    payEntryFee,
    markBrowserPaid,
    prizePoolAddress,
    user,
    worldIdVerified,
    humanityProvider,
  } = useWorld();
  const { phase, launchAt, cohortSize, reservedCount, you, isLive, pilot } = useRound();
  const { handleMascotClick } = useDelight();

  // Server-authoritative pilot posture — the UI can never offer a mechanic
  // the pilot has disabled (design review finding 1).
  const paidEntryEnabled = Boolean(pilot?.paidEntryEnabled);
  const freeEntryMode = Boolean(pilot?.freeEntryMode);
  const humanityVerified = Boolean(worldIdVerified || humanityProvider);

  const [step, setStep] = useState(() => {
    try {
      if (sessionStorage.getItem("lhs_enter_reserve") === "1") {
        sessionStorage.removeItem("lhs_enter_reserve");
        return 2;
      }
    } catch { /* ignore */ }
    return 0;
  });
  const [authing, setAuthing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [freeEntryBusy, setFreeEntryBusy] = useState(false);
  const [freeEntryError, setFreeEntryError] = useState(null);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [mascotName, setMascotName] = useState(() => {
    try {
      return localStorage.getItem("lhs_mascot_name") || "Ember";
    } catch {
      return "Ember";
    }
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lhs_profile") || "{}"); } catch { return {}; }
  });
  const [pot, setPot] = useState(null);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const enteredRef = useRef(false);
  const trackedLandingRef = useRef(false);
  const trackedHumanityRef = useRef(false);

  const verified = walletAuthed && entryPaid;
  const youReserved = Boolean(you?.isPaid) || entryPaid;

  const [referredBy] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("ref") || null; } catch { return null; }
  });

  // Funnel: landing_view once per onboarding mount.
  useEffect(() => {
    if (trackedLandingRef.current) return;
    trackedLandingRef.current = true;
    track("landing_view");
  }, []);

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

  // Funnel: verification started when the claim screen opens.
  useEffect(() => {
    if (step === 2) track("verification_started");
  }, [step]);

  useEffect(() => {
    if (step !== 2 || !humanityVerified || trackedHumanityRef.current) return;
    trackedHumanityRef.current = true;
    track("humanity_verified");
  }, [step, humanityVerified]);

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

  const markOnboardingDone = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* ignore */ }
  };

  const goToLobby = useCallback(() => {
    markOnboardingDone();
    markJustReserved();
    clearConfirming();
    onEnter();
  }, [onEnter]);

  useEffect(() => {
    if (!verified || enteredRef.current) return;
    if (!isLive && phase === "prelaunch" && youReserved) return;
    if (!isLive) return;
    enteredRef.current = true;
    const t = setTimeout(() => goToLobby(), 600);
    return () => clearTimeout(t);
  }, [verified, isLive, phase, youReserved, onEnter, goToLobby]);

  const handleWalletAuth = async () => {
    if (authing || walletAuthed) return;
    setAuthing(true);
    track("verification_started");
    try { await walletAuth(); track("wallet_connected"); } finally { setAuthing(false); }
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
      if (phase === "prelaunch") {
        goToLobby();
      } else {
        markOnboardingDone();
      }
    } finally { setPaying(false); }
  };

  const handleFreeEntry = async () => {
    if (freeEntryBusy) return;
    setFreeEntryBusy(true);
    setFreeEntryError(null);
    try {
      const resp = await fetch("/api/pay/free-entry", {
        method: "POST",
        credentials: "include",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || `free_entry_${resp.status}`);
      }
      markBrowserPaid(data.address);
      markOnboardingDone();
      if (phase === "prelaunch") {
        markConfirming();
        setStep(3);
      } else {
        goToLobby();
      }
    } catch (e) {
      console.error("free entry failed:", e);
      setFreeEntryError(
        e?.message === "humanity_verification_required"
          ? "Verify your humanity before claiming your seat."
          : e?.message === "reachability_required"
            ? "Complete the reachability steps above."
            : "Could not claim your free seat. Try again in a moment."
      );
    } finally {
      setFreeEntryBusy(false);
    }
  };

  const stepLabels = ["Welcome", "Rules", "Claim", "You're in"];

  return (
    <div
      className={`onboarding-shell flex flex-col font-body overflow-hidden bg-transparent ${
        step === 0 ? "min-h-screen" : "h-[100svh] max-h-[100svh]"
      }`}
    >
      {/* Minimal progress bar — 4 segments, no labels. */}
      {step !== 0 && (
        <div className="flex items-center justify-center gap-1.5 pt-3 px-4">
          {stepLabels.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-[width,background-color,opacity] duration-300 ease-out"
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
              onReserve={() => { track("reserve_click"); setStep(1); }}
              onDetails={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
              onSpeedRun={onSpeedRun}
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

            {/* Animated gameplay loop demo — see the game before you commit */}
            <section className="max-w-[560px] mx-auto px-5 pb-10">
              <p className="font-display text-3xl text-bone text-center tracking-wide mb-5">SEE THE LOOP</p>
              <GameplayLoopDemo />
            </section>

            {/* The stakes — cohort → 1, and the sponsor prize. */}
            <div className="pb-10">
              <ShrinkingPot prizePool={pot} cohortSize={cohortSize} />
            </div>

            {/* Sponsor prize detail + live proof + claim. */}
            <section className="max-w-[560px] mx-auto px-5 pb-20 space-y-3">
              <div className="bg-smoke/40 rounded-2xl p-4 border border-ember/30">
                <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2 text-center">
                  Sponsor prize · on-chain
                </p>
                <PrizePots prizePool={pot} />
              </div>

              <CohortTicker pollMs={15000} />

              <HumanCta onClick={() => { track("reserve_click"); setStep(1); }} className="!max-w-none !py-5 !text-lg">
                Claim your seat →
              </HumanCta>

              <div className="flex justify-center items-center gap-2 flex-wrap pt-1">
                <TrustBadge size="sm" />
                <WhatsPublicChip />
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
            transition={MOTION_SPRING.snappy}
            className="flex-1 flex flex-col min-h-0"
          >
            <StageShell
              onBack={() => setStep(0)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} populationCount={reservedCount} populationTotal={cohortSize} />}
            >
              <StageSection index={0} className="text-center">
                <Mascot variant="idle" size={64} interactive onClick={handleMascotClick} />
                <h2 className="font-display text-4xl text-bone mb-1 mt-2">THE RULES</h2>
                <p className="text-bone/60 text-sm font-body">The core loop. That's it — no hidden catches.</p>
                <MotifFrieze className="w-full mt-4 opacity-90" />
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
                <div className="rounded-2xl border border-neon/25 bg-neon/5 px-4 py-3 text-center">
                  <p className="font-mono text-neon text-[10px] uppercase tracking-[0.18em] mb-1">
                    How survival works
                  </p>
                  <p className="font-body text-bone/80 text-sm leading-snug">
                    {survivalRule("N")}
                  </p>
                </div>
              </StageSection>

              <StageSection index={6}>
                <HumanCta onClick={() => setStep(2)}>
                  Verify &amp; claim my seat →
                </HumanCta>
                {onSpeedRun && (
                  <button
                    type="button"
                    onClick={onSpeedRun}
                    {...CUE_PRESS}
                    className="w-full mt-2 py-3 rounded-xl bg-smoke border border-ember text-dim font-body text-sm hover:text-bone active:scale-[0.97] transition-colors"
                  >
                    Not sure yet? Try the practice run first
                  </button>
                )}
              </StageSection>
            </StageShell>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="claim"
            initial={{ opacity: 0, transform: "translateX(16px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateX(0) scale(1)" }}
            exit={{ opacity: 0, transform: "translateX(-16px) scale(0.98)" }}
            transition={MOTION_SPRING.snappy}
            className="flex-1 flex flex-col min-h-0"
          >
            <StageShell
              onBack={() => setShowExitIntent(true)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} populationCount={reservedCount} populationTotal={cohortSize} />}
            >
              <StageSection index={0} className="flex flex-col items-center text-center pt-2 pb-1">
                <Mascot variant={entryPaid ? "celebrating" : "excited"} size={72} interactive onClick={handleMascotClick} />
                {(() => {
                  const heading = getEntryHeading({ isFreeMode: freeEntryMode, alreadyPaid: entryPaid });
                  const personalized = getPersonalizedPaywall(profile);
                  const hasProfile = Object.keys(profile).length > 0;
                  return (
                    <>
                      <h2 className="font-display text-bone mt-3 mb-1 leading-tight" style={{ fontSize: "clamp(28px,7vw,36px)" }}>
                        {heading.title}
                      </h2>
                      <p className="text-bone/70 text-sm font-body mb-1 max-w-xs">{heading.sub}</p>
                      {!entryPaid && hasProfile && !freeEntryMode && personalized.hook !== "50 humans. One pot. Last one standing." && (
                        <p className="text-amber text-sm font-body mb-2 max-w-xs leading-relaxed">
                          {personalized.hook}
                        </p>
                      )}
                    </>
                  );
                })()}
                <MotifFrieze className="w-full mt-3 mb-1 opacity-90" />
              </StageSection>

              <div className="mt-2 space-y-3 flex-1">
                {!entryPaid && (
                  <>
                    {pot && (
                      <StageSection index={1} className="rounded-3xl p-4 border border-amber/30 bg-smoke/50 backdrop-blur-sm">
                        <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2 text-center">
                          Sponsor prize
                        </p>
                        <PrizePots prizePool={pot} />
                      </StageSection>
                    )}

                    {freeEntryMode && (
                      <StageSection index={2}>
                        {pilot?.requireHumanityForPlay && !humanityVerified && (
                          <div className="mb-3">
                            <VerifyOptIn defaultOpen required />
                          </div>
                        )}
                        <ReachabilitySetup
                          walletAuthed={walletAuthed}
                          onWalletAuth={handleWalletAuth}
                          authing={authing}
                          isWorldApp={isWorldApp}
                          isFarcaster={isFarcaster}
                          farcasterUser={farcasterUser}
                          user={user}
                          freeEntryBusy={freeEntryBusy}
                          onFreeEntry={handleFreeEntry}
                          humanityRequired={Boolean(pilot?.requireHumanityForPlay)}
                          humanityVerified={humanityVerified}
                        />
                        {freeEntryError && (
                          <p className="mt-2 rounded-xl border border-blood/30 bg-blood/5 p-3 text-center text-blood text-xs font-mono">
                            {freeEntryError}
                          </p>
                        )}
                      </StageSection>
                    )}

                    {paidEntryEnabled && (
                      <StageSection index={3} className="bg-smoke/80 border border-ember/40 rounded-3xl p-5 backdrop-blur-sm">
                        <div className="flex items-baseline justify-between mb-2">
                          <p className="font-display text-2xl text-amber">{ENTRY.paid.title}</p>
                          <p className="font-mono text-[10px] text-dim uppercase">{ENTRY.paid.cardLabel}</p>
                        </div>
                        <p className="text-bone/70 text-sm font-body mb-2 leading-relaxed">{ENTRY.paid.blurb}</p>
                        <p className="text-dim text-[11px] font-mono mb-4 leading-relaxed">
                          Browser players: verify humanity after paying to unlock full trust and voting weight.
                        </p>

                        {isWorldApp ? (
                          <>
                            {!walletAuthed ? (
                              <HumanCta onClick={handleWalletAuth} disabled={authing} className="mb-2">
                                {authing ? "Connecting…" : "Connect wallet →"}
                              </HumanCta>
                            ) : (
                              <p className="text-neon font-mono text-xs text-center mb-2">Connected</p>
                            )}
                            {walletAuthed && (
                              <HumanCta onClick={handlePay} disabled={paying}>
                                {paying ? "Processing…" : `Pay ${ENTRY_FEE_WLD} WLD →`}
                              </HumanCta>
                            )}
                          </>
                        ) : (
                          <BrowserWalletPay
                            prizePoolAddress={prizePoolAddress}
                            referredBy={referredBy}
                            onPaid={(addr) => {
                              markBrowserPaid(addr);
                              track("wallet_connected");
                              markOnboardingDone();
                              if (phase === "prelaunch") goToLobby();
                            }}
                          />
                        )}
                      </StageSection>
                    )}

                    {!isWorldApp && (
                      <StageSection index={4}>
                        <CompactButton
                          onClick={() => { markOnboardingDone(); onEnter(); }}
                          className="w-full py-2.5 rounded-xl text-dim font-body text-sm hover:text-bone"
                        >
                          Just looking? Browse the feed →
                        </CompactButton>
                      </StageSection>
                    )}
                  </>
                )}

                {entryPaid && phase !== "prelaunch" && (
                  <StageSection index={5}>
                    <HumanCta onClick={goToLobby}>
                      Enter the lobby →
                    </HumanCta>
                  </StageSection>
                )}

                {entryPaid && phase === "prelaunch" && (
                  <StageSection index={5} className="text-center">
                    <p className="text-neon font-mono text-sm animate-pulse">Taking you to the lobby…</p>
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
                          onClick={goToLobby}
                          className="px-3 py-1.5 rounded-lg bg-ember text-bone font-mono text-[11px] active:scale-95 transition-transform"
                        >
                          GO TO LOBBY →
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
            key="confirmed"
            initial={{ opacity: 0, transform: "translateX(16px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateX(0) scale(1)" }}
            exit={{ opacity: 0, transform: "translateX(-16px) scale(0.98)" }}
            transition={MOTION_SPRING.snappy}
            className="flex-1 flex flex-col min-h-0"
          >
            <StageShell
              onBack={() => setStep(2)}
              faq
              withAmbient
              AmbientComponent={<AmbientBackdrop phase={phase} populationCount={reservedCount} populationTotal={cohortSize} />}
            >
              <StageSection index={0} className="flex flex-col items-center text-center pt-2 pb-1">
                <MascotGuide
                  variant="celebrating"
                  size={72}
                  message={getProfiledMascotLines().survived}
                  position="top"
                  interactive
                  onMascotClick={handleMascotClick}
                />
                <h2 className="font-display text-bone mt-3 mb-1 leading-tight" style={{ fontSize: "clamp(28px,7vw,36px)" }}>
                  YOU'RE IN
                </h2>
                <p className="text-bone/70 text-sm font-body mb-1 max-w-xs">
                  Free seat secured. Day 1 opens soon.
                </p>
                <MotifFrieze className="w-full mt-3 mb-1 opacity-90" />
              </StageSection>

              <StageSection index={1}>
                <div className="rounded-3xl border border-amber/35 p-5 text-center bg-smoke/50 backdrop-blur-sm">
                  <p className="font-mono text-amber text-[10px] uppercase tracking-[0.18em] mb-2">
                    Day 1 opens in
                  </p>
                  {launchAt
                    ? <Countdown targetIso={launchAt} className="font-display text-4xl text-bone tabular-nums animate-glow" />
                    : <p className="font-display text-3xl text-dim">TBA</p>}
                </div>
              </StageSection>

              {/* Reminders — the "Return" commitment starts now */}
              <StageSection index={2}>
                <p className="font-mono text-dim text-[10px] uppercase tracking-widest mb-2 text-center">
                  Don't miss the window
                </p>
                <PushOptIn />
              </StageSection>

              {/* Invite — one attributable link */}
              {user?.referralCode && (
                <StageSection index={3} className="bg-smoke/60 border border-neon/20 rounded-3xl p-5 backdrop-blur-sm">
                  <p className="font-display text-lg text-neon mb-1">Bring a friend</p>
                  <p className="font-body text-bone/60 text-xs leading-relaxed mb-3">
                    More humans in the cohort. Same stakes.
                  </p>
                  <SharePanel
                    referralCode={user.referralCode}
                    referralCount={user.referralCount ?? 0}
                  />
                </StageSection>
              )}

              {/* Optional personalization — deferred out of the critical path */}
              <StageSection index={4}>
                <button
                  type="button"
                  onClick={() => setShowPersonalize(!showPersonalize)}
                  className="text-dim text-xs font-mono underline mb-3 text-left"
                >
                  {showPersonalize ? "Hide" : "Optional: personalize your guide"}
                </button>
                {showPersonalize && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={mascotName}
                      onChange={(e) => setMascotName(e.target.value)}
                      onBlur={() => mascotName && localStorage.setItem("lhs_mascot_name", mascotName)}
                      placeholder="Name your guide (Ember)"
                      className="w-full bg-smoke border border-ember rounded-xl px-4 py-3 text-bone font-mono text-sm"
                      maxLength={20}
                    />
                    {PROFILE_QUESTIONS.map((q) => (
                      <div key={q.id}>
                        <p className="font-display text-base text-bone mb-2">{q.question}</p>
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const selected = profile[q.id] === opt.value;
                            return (
                              <CompactButton
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  const next = { ...profile, [q.id]: opt.value };
                                  setProfile(next);
                                  try { localStorage.setItem("lhs_profile", JSON.stringify(next)); } catch { /* ignore */ }
                                }}
                                className={`w-full flex items-center gap-3 rounded-xl p-2.5 border text-left ${
                                  selected
                                    ? "bg-amber/15 border-amber/60"
                                    : "bg-smoke/70 border-ember/40 hover:border-amber/30"
                                }`}
                              >
                                <span className="text-xl shrink-0">{opt.emoji}</span>
                                <div className="min-w-0">
                                  <p className={`font-display text-sm leading-tight ${selected ? "text-amber" : "text-bone"}`}>
                                    {opt.label}
                                  </p>
                                </div>
                                {selected && <span className="ml-auto text-amber text-sm shrink-0">✓</span>}
                              </CompactButton>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </StageSection>

              <StageSection index={5}>
                <HumanCta onClick={goToLobby}>
                  Go to the lobby →
                </HumanCta>
              </StageSection>
            </StageShell>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit-intent softening — catches users who tap back on the claim screen */}
      <ExitIntentPrompt
        open={showExitIntent}
        onStay={() => setShowExitIntent(false)}
        onPractice={() => {
          setShowExitIntent(false);
          setStep(1);
        }}
        onLeave={() => {
          setShowExitIntent(false);
          setStep(2);
        }}
      />
    </div>
  );
}
