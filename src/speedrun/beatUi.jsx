import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeMotif from "../components/ui/ThemeMotif.jsx";
import MotifFrieze from "../components/ui/MotifFrieze.jsx";
import DozingCat from "../components/ui/DozingCat.jsx";
import ThemeFairness from "../components/ThemeFairness.jsx";
import { HumanCta, GameCta } from "../components/ui/CraftCta.jsx";
import { CeremonyContent } from "../components/ui/Ceremony.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

export { HumanCta, GameCta };

/**
 * Shared speed-run UI — cold system chrome + warm human motifs
 * (docs/ART_DIRECTION.md). CTAs live in CraftCta so live game matches.
 *
 * The inner column + spring entrance come from the shared CeremonyContent
 * (src/components/ui/Ceremony.jsx) — the same contract the live overlays use.
 * The demo's SpeedRunShell already provides the full-screen room, so this
 * wrapper only supplies the flex-1 scroll container around it.
 */

/** Centered ceremony stage with staggered entrance. */
export function Ceremony({ children, className = "" }) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-5 pb-10 ${className}`}>
      <CeremonyContent className="flex flex-col items-center">{children}</CeremonyContent>
    </div>
  );
}

/** Soft shelf under cold-machine moments so the hand never vanishes mid-arc. */
function QuietFrieze({ className = "w-full mt-5 mb-6 opacity-85" }) {
  return <MotifFrieze className={className} />;
}

/**
 * Day unlock — theme is the human hero; rule text is the cold system.
 * Mirrors MissionBoard's "today's mission" composition.
 */
export function DayReveal({ day, theme, unlock, onContinue, capFrom, capTo }) {
  const [step, setStep] = useState("theme"); // theme | twist
  if (!unlock || !theme) return null;

  return (
    <Ceremony>
      <p
        className="font-mono text-amber/90 uppercase mb-4"
        style={{ fontSize: 10, letterSpacing: "0.2em" }}
      >
        {unlock.eyebrow || `Day ${day} of 5`}
      </p>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: MOTION_DURATION.slow, delay: 0.05, ease: MOTION_EASE.out }}
        className="mb-3"
      >
        <ThemeMotif emoji={theme.emoji} size={104} label={theme.theme} />
      </motion.div>

      <h2
        className="font-display text-bone leading-[0.9] mb-2"
        style={{ fontSize: "clamp(34px,9vw,48px)" }}
      >
        {theme.theme}
      </h2>

      <p className="font-mono text-neon/80 uppercase mb-4" style={{ fontSize: 10, letterSpacing: "0.16em" }}>
        Today&apos;s riddle
      </p>

      <AnimatePresence mode="wait">
        {step === "theme" ? (
          <motion.div
            key="theme-dwell"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
            className="w-full"
          >
            <QuietFrieze className="w-full mb-6 opacity-85" />
            <HumanCta onClick={() => setStep("twist")}>
              Reveal the twist →
            </HumanCta>
          </motion.div>
        ) : (
          <motion.div
            key="twist"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
            className="w-full"
          >
            <div className="w-full rounded-3xl border border-ember/30 bg-smoke/50 backdrop-blur-sm p-4 mb-5 text-left">
              <p className="font-mono text-amber text-[10px] tracking-[0.18em] uppercase mb-1.5">
                The twist
              </p>
              <p className="font-display text-2xl text-bone leading-snug mb-2">
                {unlock.title}
              </p>
              <p className="font-body text-bone/75 text-sm leading-relaxed">
                {unlock.body}
              </p>
              {capFrom != null && capTo != null && (
                <p className="mt-3 font-mono text-dim text-[11px] tabular-nums">
                  Survival cap{" "}
                  <span className="text-bone">{capFrom}</span>
                  <span className="text-dim mx-1">→</span>
                  <span className="text-amber">{capTo}</span>
                </p>
              )}
            </div>

            <ThemeFairness theme={theme} className="mb-4 w-full" />
            <QuietFrieze className="w-full mb-6 opacity-70" />

            <HumanCta onClick={onContinue}>
              {(unlock.cta || "I'm in").replace(/→\s*$/, "").trim()} →
            </HumanCta>
          </motion.div>
        )}
      </AnimatePresence>
    </Ceremony>
  );
}

export function CutCeremony({ from, to, title, body, chip, onContinue, cta = "Continue →" }) {
  return (
    <Ceremony>
      <p className="font-mono text-blood/80 uppercase mb-5" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
        Day close
      </p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.out }}
        className="font-display text-bone mb-3 tabular-nums"
        style={{ fontSize: "clamp(48px,12vw,64px)", lineHeight: 0.9 }}
      >
        {from}
        <span className="text-dim text-[0.45em] mx-2">→</span>
        <span className="text-amber">{to}</span>
      </motion.div>
      <h2 className="font-display text-3xl text-bone mb-3">{title}</h2>
      <p className="font-body text-bone/75 text-sm leading-relaxed mb-4 max-w-xs">{body}</p>
      {chip && (
        <p className="font-mono text-neon text-[11px] tracking-wide mb-3">{chip}</p>
      )}
      <div className="flex justify-center mb-2">
        <DozingCat size={56} />
      </div>
      <QuietFrieze className="w-full mb-6 opacity-85" />
      <HumanCta onClick={onContinue}>{cta}</HumanCta>
    </Ceremony>
  );
}

/**
 * DrawCeremony — the seed lottery, staged (Riddle Rounds §5.1).
 *
 * The fairness centerpiece: everyone who checked in is eligible, and when the
 * field overflows the cap a deterministic cohort-seed lottery decides who
 * survives — not speed. Entrants flip one by one to SURVIVED / NOT DRAWN so
 * the player FEELS the draw instead of reading a clause about it. The public
 * seed + algorithm are shown so the mechanic reads as auditable, not random.
 */
export function DrawCeremony({ draw, onContinue, cta = "Continue →" }) {
  const [revealed, setRevealed] = useState(0);
  const entrants = draw?.entrants ?? [];
  const done = revealed >= entrants.length;

  // Flip entrants one at a time.
  useEffect(() => {
    if (done) return undefined;
    const t = setTimeout(() => setRevealed((n) => n + 1), 340);
    return () => clearTimeout(t);
  }, [revealed, done]);

  if (!draw) return null;

  return (
    <Ceremony>
      <p className="font-mono text-amber/90 uppercase mb-3" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
        Day {draw.day} · the draw
      </p>
      <h2 className="font-display text-bone leading-[0.9] mb-1" style={{ fontSize: "clamp(30px,8vw,42px)" }}>
        The seed lottery
      </h2>
      <p className="font-body text-bone/60 text-sm mb-4 max-w-xs leading-relaxed">
        {draw.eligible} checked in. Only {draw.cap} survive. No one raced — the
        draw decides, and anyone can replay it from the public seed.
      </p>

      <div className="w-full max-w-sm rounded-3xl border border-ember/30 bg-smoke/50 backdrop-blur-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-dim text-[10px] uppercase tracking-widest">Eligible</p>
          <p className="font-mono text-bone text-[11px] tabular-nums">{draw.eligible} → {draw.cap}</p>
        </div>
        <ul className="space-y-1.5">
          {entrants.map((e, i) => {
            const isRevealed = i < revealed;
            return (
              <motion.li
                key={e.user}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                  !isRevealed
                    ? "border-ember/20 bg-ash/30"
                    : e.survived
                      ? "border-neon/40 bg-neon/10"
                      : "border-blood/40 bg-blood/10"
                }`}
              >
                <span className={`font-mono text-xs ${e.isYou ? "text-amber" : "text-bone/85"}`}>
                  {e.user}{e.isYou ? " · you" : ""}
                </span>
                <span
                  className={`font-mono text-[9px] uppercase tracking-widest ${
                    !isRevealed ? "text-dim/40" : e.survived ? "text-neon" : "text-blood"
                  }`}
                >
                  {!isRevealed ? "…" : e.survived ? "survived" : "not drawn"}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-ember/25 bg-ash/40 px-3 py-2 mb-5 text-left">
        <p className="font-mono text-dim/70 text-[9px] leading-relaxed break-all">
          seed <span className="text-bone/60">{draw.seed}</span> · {draw.algorithm}
        </p>
      </div>

      <HumanCta onClick={onContinue} disabled={!done}>
        {done ? "See the cut →" : "Drawing…"}
      </HumanCta>
    </Ceremony>
  );
}

/** Mission card — MissionBoard parity for check-in / path beats.
 *  `mantra` is the task ("your photo is your answer"); `footnote` is an
 *  optional de-emphasized mechanic line (e.g. the seed lottery) so it informs
 *  without hijacking the job. */
export function ThemeMissionCard({ day, theme, mantra, footnote, children }) {
  return (
    <div className="bg-smoke/75 border border-neon/20 rounded-3xl p-5 mb-4 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute -right-3 -top-3 opacity-30 pointer-events-none" aria-hidden>
        <ThemeMotif emoji={theme.emoji} size={88} label={theme.theme} />
      </div>
      <p className="font-mono text-neon text-[10px] tracking-widest uppercase mb-1 relative">
        Today&apos;s mission · Day {day} of 5
      </p>
      <div className="flex items-center gap-3 mb-3 relative">
        <ThemeMotif emoji={theme.emoji} size={56} label={theme.theme} />
        <p className="font-display text-3xl text-bone leading-tight">{theme.theme}</p>
      </div>
      <p className="font-mono text-amber text-[10px] tracking-[0.18em] uppercase mb-1 relative">
        Your only job today
      </p>
      <p className={`font-display text-xl text-bone leading-snug relative ${footnote ? "mb-1" : "mb-3"}`}>
        {mantra}
      </p>
      {footnote && (
        <p className="text-dim text-[10px] font-mono leading-relaxed mb-3 relative">{footnote}</p>
      )}
      {theme.description && (
        <p className="text-dim text-xs font-body leading-relaxed mb-3 relative">{theme.description}</p>
      )}
      <ThemeFairness theme={theme} />
      {children}
    </div>
  );
}

export function OutcomeCeremony({ eyebrow, title, titleTone = "bone", body, chip, onContinue }) {
  const titleColor =
    titleTone === "neon" ? "text-neon" :
    titleTone === "amber" ? "text-amber" :
    titleTone === "blood" ? "text-blood" : "text-bone";
  return (
    <Ceremony>
      <p className="font-mono text-dim uppercase mb-3" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
        {eyebrow}
      </p>
      <h2 className={`font-display leading-[0.95] mb-3 ${titleColor}`} style={{ fontSize: "clamp(28px,7vw,40px)" }}>
        {title}
      </h2>
      <p className="font-body text-bone/75 text-sm leading-relaxed mb-4 max-w-xs">{body}</p>
      {chip && <p className="font-mono text-neon text-[11px] mb-3">{chip}</p>}
      <div className="flex justify-center mb-2">
        <DozingCat
          size={60}
          title={titleTone === "blood" ? "still here with you" : "a sleeping cat, keeping you company"}
        />
      </div>
      <QuietFrieze className="w-full mb-6 opacity-85" />
      <HumanCta onClick={onContinue}>Continue →</HumanCta>
    </Ceremony>
  );
}
