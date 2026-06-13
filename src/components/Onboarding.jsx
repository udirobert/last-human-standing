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
            className="flex-1 flex flex-col items-center px-6 pt-6 pb-10 overflow-y-auto"
          >
            <div className="flex flex-col items-center text-center w-full max-w-md">
              <Mascot variant="excited" size={80} />
              <h1 className="font-display text-4xl text-bone mt-4 leading-none tracking-wider animate-glow">
                LAST<br />HUMAN<br />STANDING
              </h1>
              <p className="text-bone font-mono text-sm mt-4 max-w-xs leading-relaxed">
                Be one of 50 humans. Check in at a daily themed location. Last survivor takes the on-chain pot.
              </p>
              <div className="mt-3">
                <TrustBadge size="md" />
              </div>
            </div>

            <div className="w-full max-w-md mt-6 space-y-3">
              {/* How a day looks — concrete micro-example */}
              <div className="bg-smoke rounded-2xl p-4 border border-ember/50">
                <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-3">Here's how a day looks</p>
                <ul className="space-y-2">
                  <li className="flex gap-3 font-mono text-sm text-bone">
                    <span className="text-lg shrink-0">☕</span>
                    <span>Theme drops (e.g. <span className="text-amber">AT A CAFÉ</span>)</span>
                  </li>
                  <li className="flex gap-3 font-mono text-sm text-bone">
                    <span className="text-lg shrink-0">📸</span>
                    <span>You have a few hours to take a photo at any café on Earth</span>
                  </li>
                  <li className="flex gap-3 font-mono text-sm text-bone">
                    <span className="text-lg shrink-0">🗳️</span>
                    <span>The community votes you HUMAN or SUS</span>
                  </li>
                  <li className="flex gap-3 font-mono text-sm text-bone">
                    <span className="text-lg shrink-0">🏆</span>
                    <span>First 25 of 50 advance. Last one standing wins the pot.</span>
                  </li>
                </ul>
              </div>

              {/* Cohort + pot card */}
              <div className="bg-smoke rounded-2xl p-4 border border-ember">
                <p className="font-mono text-dim text-xs uppercase mb-1">Cohort 1</p>
                <p className="font-display text-3xl text-bone">{reservedCount.toLocaleString()}<span className="text-dim text-lg"> / {cohortSize}</span></p>
                <div className="mt-2 h-1.5 bg-ember rounded-full overflow-hidden">
                  <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${cohortPct}%` }} />
                </div>
                <div className="mt-3">
                  <PrizePots prizePool={pot} />
                </div>
                {launchAt && phase === "prelaunch" && (
                  <p className="text-amber font-mono text-xs mt-3 text-right">
                    Day 1 in <Countdown targetIso={launchAt} className="inline" />
                  </p>
                )}
                {launchAt && phase === "prelaunch" && (
                  <p className="text-dim text-[11px] font-mono mt-2 leading-relaxed">
                    When the clock hits zero, the theme drops. Race to be one of the first 25 to check in.
                  </p>
                )}
              </div>

              {/* Daily pulse — community teaser, even before signup */}
              <DailyPrompt />

              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-5 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95 transition-transform"
              >
                HOW TO PLAY →
              </button>

              {/* FAQ accordion */}
              <div className="mt-2 space-y-2">
                {FAQS.map((item, i) => (
                  <div key={item.q} className="bg-smoke/60 rounded-xl border border-ember/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full px-4 py-3 text-left font-mono text-xs text-bone flex items-center justify-between gap-3"
                    >
                      <span>{item.q}</span>
                      <span className="text-amber text-base shrink-0">{faqOpen === i ? "−" : "+"}</span>
                    </button>
                    {faqOpen === i && (
                      <div className="px-4 pb-3 font-mono text-[11px] text-dim leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
            className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center"
          >
            <Mascot variant="celebrating" size={80} />
            <h2 className="font-display text-4xl text-bone mt-6">YOU&apos;RE IN</h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <TrustBadge size="md" />
              {phase === "prelaunch" && <EarlyBadge size="md" reservedAt={user?.reservedAt} />}
            </div>
            <div className="w-full mt-4 px-2">
              <PushOptIn />
            </div>
            {phase === "prelaunch" && launchAt && (
              <p className="text-dim font-mono text-sm mt-4">Day 1 starts in <Countdown targetIso={launchAt} className="text-amber" /></p>
            )}
            <p className="text-dim text-xs font-mono mt-2 max-w-xs">
              The full prelaunch home — countdown, share link, leaderboard, daily prompt — is waiting in the lobby.
            </p>
            <button
              type="button"
              onClick={() => { markOnboardingDone(); onEnter(); }}
              className="w-full mt-6 py-4 rounded-2xl bg-blood text-bone font-display text-2xl tracking-widest active:scale-95"
            >
              {isLive ? "ENTER ARENA →" : "ENTER LOBBY →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
