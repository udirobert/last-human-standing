import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeMotif from "./ThemeMotif.jsx";
import CoffeeBrew from "./CoffeeBrew.jsx";
import DozingCat from "./DozingCat.jsx";
import MotifFrieze from "./MotifFrieze.jsx";
import EmberField from "./EmberField.jsx";
import { CUE_PRESS, CUE_HOVER } from "../../lib/cuelume.js";

/**
 * LandingHero — the cinematic front door (docs/ART_DIRECTION.md).
 *
 * The main conversion surface and, until launch, the whole product. Three jobs
 * at once: build anticipation (a big ticking clock + live scarcity), hint at the
 * game (the painted human moments), and feel incredible on BOTH mobile and
 * desktop. It breaks out of the 430px game shell (Onboarding toggles
 * body.landing-mode) so desktop reads as a full atmospheric world.
 *
 * Layout: a grid-centered section wrapping a plain block, text-align:center
 * column — deliberately no flexbox on the content axis (flex-item sizing quirks
 * dragged the column off-centre on narrow viewports). Cold machine clock over a
 * warm hand-painted world = the cold-system / warm-human spine.
 */

function diff(targetIso) {
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const ms = Math.max(0, target - Date.now());
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
    done: ms === 0,
  };
}

const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function HeroCountdown({ targetIso }) {
  const [t, setT] = useState(() => diff(targetIso));
  const [cycleIndex, setCycleIndex] = useState(0);
  
  // Cycle through mystery emojis for theme teasers
  const mysteryEmojis = ["❓", "🔮", "✨", "🎯", "🎲", "🌟"];
  
  useEffect(() => {
    if (!targetIso) return undefined;
    const id = setInterval(() => setT(diff(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  
  useEffect(() => {
    const emojiInterval = setInterval(() => {
      setCycleIndex((i) => (i + 1) % mysteryEmojis.length);
    }, 4000);
    return () => clearInterval(emojiInterval);
  }, []);
  
  if (!targetIso) return null;

  const units = [
    ["days", t.d],
    ["hrs", t.h],
    ["min", t.m],
    ["sec", t.s],
  ];
  
  // Dramatic copy based on time remaining
  let countdownCopy = "The game begins";
  if (t.d === 0 && t.h < 24) {
    countdownCopy = "Tomorrow, the proof begins";
  } else if (t.d === 0 && t.h < 1) {
    countdownCopy = "The moment is now";
  } else if (t.d < 3) {
    countdownCopy = "Your proof awaits";
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-start justify-center mb-4" style={{ gap: "clamp(8px,1.6vw,18px)" }}>
        {units.map(([label, value], i) => (
          <div key={label} className="flex items-start" style={{ gap: "clamp(8px,1.6vw,18px)" }}>
            <div className="flex flex-col items-center">
              <span className="font-display text-bone leading-[0.86] tabular-nums" style={{ fontSize: "clamp(44px,9vw,92px)" }}>
                {String(value).padStart(2, "0")}
              </span>
              <span
                className="font-mono text-dim uppercase mt-1.5"
                style={{ fontSize: "clamp(8px,1vw,11px)", letterSpacing: "0.2em" }}
              >
                {label}
              </span>
            </div>
            {i < 3 && (
              <span className="font-display text-amber/50 leading-[0.86]" style={{ fontSize: "clamp(40px,8vw,84px)" }}>
                :
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Cycling mystery theme preview */}
      <div className="flex items-center gap-2">
        <motion.span
          key={cycleIndex}
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
          transition={{ duration: 0.4 }}
          className="text-3xl"
          aria-hidden
        >
          {mysteryEmojis[cycleIndex]}
        </motion.span>
        <span className="font-mono text-amber/80 text-xs uppercase tracking-widest">
          {countdownCopy}
        </span>
        <motion.span
          key={cycleIndex + 10}
          initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: -10 }}
          transition={{ duration: 0.4 }}
          className="text-3xl"
          aria-hidden
        >
          {mysteryEmojis[(cycleIndex + 3) % mysteryEmojis.length]}
        </motion.span>
      </div>
    </div>
  );
}

export default function LandingHero({ targetIso, reservedCount = 0, cohortSize = 50, onReserve, onDetails, onSpeedRun }) {
  // Tiered urgency — shifts with cohort fill so the scarcity copy feels real
  // instead of shouting "filling fast" at 2/50.
  let statusLine;
  if (reservedCount === 0) {
    statusLine = { text: "Be among the first", urgent: false };
  } else if (reservedCount < 15) {
    statusLine = { text: "Early birds", urgent: false };
  } else if (reservedCount < 30) {
    statusLine = { text: "Filling up", urgent: false };
  } else if (reservedCount < 45) {
    statusLine = { text: "Slots filling fast", urgent: true };
  } else if (reservedCount < cohortSize) {
    statusLine = { text: "Almost full", urgent: true };
  } else {
    statusLine = { text: "COHORT FULL · join the waitlist", urgent: true };
  }
  const filling = statusLine.urgent;

  return (
    <section
      className="relative w-full"
      style={{
        display: "grid",
        // minmax(0,1fr): a viewport-width column that can shrink below its
        // content — WITHOUT this, the implicit auto column sizes to the widest
        // child (the title) and drags the centered layout off-screen.
        gridTemplateColumns: "minmax(0, 1fr)",
        justifyItems: "center",
        alignItems: "center",
        minHeight: "100svh",
        // NOTE: no overflow-x here. Setting only overflow-x (without overflow-y)
        // makes the browser compute overflow-y as `auto`, silently turning this
        // section into its own scroll container — one of several nested ones
        // that, combined with overscroll-behavior:none, fully blocked desktop
        // wheel scroll on the landing. The ambient motif layer below already
        // clips its own horizontal bleed, so this isn't needed for that either.
        // A genuinely warm, lit room — not merely "less black". The previous
        // stops (#22/#15/#09) were still all in the near-black luminance
        // range regardless of their brown hue, and read as gloomy rather than
        // warm. Confirmed by eye against the live site before committing.
        background: "radial-gradient(130% 95% at 50% 0%, #4a3221 0%, #2e2013 45%, #1a120c 100%)",
      }}
    >
      {/* warm paper grain */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.05, mixBlendMode: "soft-light", backgroundImage: PAPER_GRAIN, backgroundSize: "300px 300px" }}
      />

      {/* ambient world — bounded + clipped so it can never expand the page.
          Opacity raised from ~0.12-0.16 (near-invisible ghosts) to 0.32 so
          this actually reads as a living, warm world rather than vanishing
          into the backdrop. */}
      <div aria-hidden="true" className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        {/* A visible ripple, contained strictly to this same box — can never
            escape the hero or bleed into cards further down the page.
            Positioned low, in the open space around the warm halo/frieze —
            centering it behind the title (the obvious first instinct) hid
            most of it behind that same opaque text. */}
        <EmberField cy={78} />
        <div className="absolute left-[3%] top-[15%]" style={{ opacity: 0.32 }}>
          <ThemeMotif emoji="🌳" size={92} />
        </div>
        <div className="absolute right-[5%] bottom-[11%]" style={{ opacity: 0.32 }}>
          <DozingCat size={90} />
        </div>
        <div className="hidden sm:block absolute right-[6%] top-[13%]" style={{ opacity: 0.3 }}>
          <CoffeeBrew size={78} />
        </div>
        <div className="hidden sm:block absolute left-[7%] bottom-[14%]" style={{ opacity: 0.3 }}>
          <ThemeMotif emoji="🍜" size={74} />
        </div>
        <div className="hidden md:block absolute left-1/2 top-[7%] -translate-x-1/2" style={{ opacity: 0.28 }}>
          <ThemeMotif emoji="🌅" size={80} />
        </div>
      </div>

      {/* foreground — plain block flow, centered text. No flex on this axis. */}
      <div
        className="relative z-[2]"
        style={{ width: "100%", maxWidth: 720, padding: "clamp(28px,5vw,64px) 20px", textAlign: "center" }}
      >
        <p
          className="font-mono text-amber/90 uppercase"
          style={{ fontSize: "clamp(10px,1.4vw,13px)", letterSpacing: "0.16em" }}
        >
          A daily real-world game
        </p>

        <div style={{ margin: "clamp(14px,2vw,22px) 0 clamp(6px,1vw,10px)" }}>
          <HeroCountdown targetIso={targetIso} />
        </div>
        <p className="font-mono text-dim uppercase" style={{ fontSize: "clamp(9px,1.1vw,11px)", letterSpacing: "0.2em" }}>
          Cohort 1 begins
        </p>

        <h1
          className="font-display text-bone"
          style={{
            fontSize: "clamp(50px,12vw,132px)",
            lineHeight: 0.82,
            letterSpacing: "0.02em",
            marginTop: "clamp(8px,1.5vw,14px)",
            textShadow: "0 0 60px rgba(255,184,0,0.12)",
          }}
        >
          LAST HUMAN
          <br />
          STANDING
        </h1>

        <p
          className="font-body text-bone/90"
          style={{
            fontSize: "clamp(15px,2vw,20px)",
            lineHeight: 1.5,
            // px/vw cap (not ch) so it can't overflow before the web font loads
            maxWidth: "min(30rem, calc(100vw - 44px))",
            margin: "clamp(16px,2vw,22px) auto 0",
          }}
        >
          50 humans. 5 days. Each day, prove you're still here — from{" "}
          <b className="text-amber font-semibold">anywhere on Earth</b>. The crowd votes people out. The field
          narrows. One human takes the pot.
        </p>

        <MotifFrieze className="w-full" style={{ marginTop: "clamp(22px,3vw,34px)" }} />
        <p className="font-mono text-dim uppercase mt-2.5" style={{ fontSize: "11px", letterSpacing: "0.14em" }}>
          the little proofs you're human
        </p>

        {/* CTAs — stack on mobile, side by side ≥ sm */}
        <div
          className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3"
          style={{ marginTop: "clamp(24px,3vw,34px)" }}
        >
          <button
            type="button"
            onClick={onReserve}
            {...CUE_PRESS}
            className="font-body font-semibold text-[#1a1206] bg-amber rounded-2xl px-7 py-4 active:scale-[0.97] transition-transform"
            style={{ fontSize: "clamp(15px,1.6vw,17px)", boxShadow: "0 10px 30px -8px rgba(255,184,0,0.5)" }}
          >
            Reserve your slot →
          </button>
          {onSpeedRun && (
            <button
              type="button"
              onClick={onSpeedRun}
              {...CUE_PRESS}
              className="font-body font-semibold text-bone bg-blood/90 rounded-2xl px-7 py-4 active:scale-[0.97] transition-transform"
              style={{ fontSize: "clamp(15px,1.6vw,17px)" }}
            >
              Try the 15-min speed run →
            </button>
          )}
          <button
            type="button"
            onClick={onDetails}
            {...CUE_HOVER}
            data-cuelume-press="tick"
            className="font-body font-semibold text-bone bg-transparent border border-bone/20 rounded-2xl px-7 py-4 active:scale-[0.97] transition-transform"
            style={{ fontSize: "clamp(15px,1.6vw,17px)" }}
          >
            See how it works ↓
          </button>
        </div>

        <div className="mt-5 font-mono text-dim" style={{ fontSize: "12px" }}>
          <span className="inline-flex items-center gap-2 align-middle">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: filling ? "#FFB800" : "#00FF94",
                boxShadow: filling ? "0 0 10px rgba(255,184,0,0.7)" : "0 0 10px #00FF94",
              }}
            />
            <b className="text-bone font-semibold tabular-nums">{reservedCount.toLocaleString()}</b>
            <span>
              of {cohortSize} reserved · <span className={filling ? "text-amber" : ""}>{statusLine.text}</span>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
