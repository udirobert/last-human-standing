import { useState } from "react";
import { motion } from "framer-motion";
import { TODAY_THEME, findTheme, DAILY_THEMES } from "../data/game";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import { MascotAvatar } from "./Mascot.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * VotePreview — prelaunch educational briefing for the Audit tab.
 *
 * When the game hasn't started and there are no submissions, this replaces
 * the bare "No submissions yet" empty state with a rich explainer that:
 *   1. Shows a mock submission card with the HUMAN / SUS voting UI
 *   2. Explains the three-step audit loop (check-in → vote → verdict)
 *   3. Previews today's theme so players know what to expect
 *   4. Shows the detective rank ladder as a progression teaser
 *
 * The mock card is interactive — tapping HUMAN or SUS gives haptic-style
 * visual feedback and a one-line explanation, so players learn by doing
 * before the game starts.
 */

const STEPS = [
  {
    icon: "📸",
    title: "Players check in",
    body: "Each day has a theme. Players snap a photo proving they're really there.",
  },
  {
    icon: "⚖️",
    title: "You vote HUMAN or SUS",
    body: "Every submission lands here. You judge the proof — does this person belong, or is it a bluff?",
  },
  {
    icon: "🔥",
    title: "The verdict decides survival",
    body: "Once quorum is reached, the majority rules. Flagged players are disqualified — the next player takes their slot.",
  },
];

const RANKS = [
  { votes: "0", label: "Rookie Juror", emoji: "🌱" },
  { votes: "5", label: "Junior Detective", emoji: "🔍" },
  { votes: "10", label: "Seasoned Juror", emoji: "📋" },
  { votes: "10+", label: "Bloodhound", emoji: "🐕" },
  { votes: "20+", label: "Sherlock", emoji: "🏆" },
];

function MockSubmissionCard() {
  const [vote, setVote] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleVote = (type) => {
    if (vote) return;
    setVote(type);
    setShowFeedback(true);
  };

  const themeEmoji = (findTheme(TODAY_THEME.theme) || TODAY_THEME).emoji;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
      className="relative z-10 bg-smoke border border-ember rounded-3xl overflow-hidden"
    >
      {/* Photo placeholder with theme motif */}
      <div className="w-full aspect-[4/5] max-h-[50vh] flex items-center justify-center bg-ash/80 relative">
        <ThemeMotif emoji={themeEmoji} size={96} label={TODAY_THEME.theme} />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-ash/80 backdrop-blur text-bone border border-ember/50">
            @survivor_42
          </span>
          <span
            className="font-mono text-[10px] px-2 py-1 rounded-full bg-ash/80 backdrop-blur tracking-widest flex items-center gap-1"
            style={{ color: "#FFB800", border: "1px solid #FFB80088" }}
          >
            <MascotAvatar status="pending" size={16} />
            ON TRIAL
          </span>
        </div>
      </div>

      <div className="p-4 pt-3">
        <p className="text-bone text-sm leading-relaxed mb-1">
          {TODAY_THEME.theme.toLowerCase()} — here's my proof ☕
        </p>

        {/* Mock tally — 50/50 to show the bar */}
        <div className="mt-3">
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <p className="font-mono text-[10px] text-neon uppercase tracking-widest">Human</p>
              <p className="font-display text-3xl text-neon leading-none tabular-nums">3</p>
            </div>
            <p className="font-mono text-dim text-xs pb-1 tabular-nums">50% · 50%</p>
            <div className="text-right">
              <p className="font-mono text-[10px] text-blood uppercase tracking-widest">Sus</p>
              <p className="font-display text-3xl text-blood leading-none tabular-nums">3</p>
            </div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden border border-ember/40 bg-ash">
            <div className="h-full bg-neon" style={{ width: "50%" }} />
            <div className="h-full bg-blood" style={{ width: "50%" }} />
          </div>
        </div>

        <div className="mt-2 h-1 bg-ash rounded-full overflow-hidden">
          <div className="h-full bg-amber/70 rounded-full" style={{ width: "60%" }} />
        </div>
        <p className="text-dim text-[10px] font-mono mt-1">
          Quorum 6/10
          {vote && ` · you voted ${vote === "real" ? "HUMAN" : "SUS"}`}
        </p>

        {/* Interactive vote buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleVote("real")}
            disabled={Boolean(vote)}
            className={`py-4 rounded-2xl font-display text-xl tracking-widest active:scale-[0.97] transition-transform disabled:opacity-45 ${
              vote === "real"
                ? "bg-neon text-ash border-2 border-neon"
                : "bg-neon/15 border-2 border-neon/50 text-neon"
            }`}
          >
            HUMAN
          </button>
          <button
            type="button"
            onClick={() => handleVote("fake")}
            disabled={Boolean(vote)}
            className={`py-4 rounded-2xl font-display text-xl tracking-widest active:scale-[0.97] transition-transform disabled:opacity-45 ${
              vote === "fake"
                ? "bg-blood text-bone border-2 border-blood"
                : "bg-blood/15 border-2 border-blood/50 text-blood"
            }`}
          >
            SUS
          </button>
        </div>

        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 py-2 px-3 rounded-xl text-center font-mono text-xs bg-amber/10 border border-amber/30 text-amber"
          >
            {vote === "real"
              ? "You voted HUMAN — if the crowd agrees, this player survives the day."
              : "You voted SUS — if the crowd agrees, this player is eliminated."}
            <br />
            <span className="text-dim text-[10px]">
              This is a demo card. Real submissions appear when the game goes live.
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function StepCard({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: MOTION_DURATION.base,
        ease: MOTION_EASE.smooth,
        delay: index * 0.08,
      }}
      className="flex gap-3 items-start"
    >
      <div className="w-10 h-10 rounded-xl bg-smoke border border-ember/40 flex items-center justify-center text-lg shrink-0">
        {step.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm text-bone mb-0.5">{step.title}</p>
        <p className="text-dim text-xs leading-relaxed">{step.body}</p>
      </div>
    </motion.div>
  );
}

function RankLadder() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {RANKS.map((rank, i) => (
        <div key={rank.label} className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl bg-smoke/60 border border-ember/30 min-w-[72px]">
            <span className="text-lg">{rank.emoji}</span>
            <span className="font-mono text-[9px] text-dim tabular-nums">{rank.votes} votes</span>
            <span className="font-display text-[10px] text-bone text-center leading-tight">{rank.label}</span>
          </div>
          {i < RANKS.length - 1 && (
            <span className="text-ember/40 text-xs">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ThemePreview() {
  const nextThemes = DAILY_THEMES.slice(0, 5);
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {nextThemes.map((t) => (
        <div
          key={t.id}
          className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl bg-smoke/60 border border-ember/30 shrink-0"
        >
          <ThemeMotif emoji={t.emoji} size={36} label={t.theme} />
          <span className="font-mono text-[9px] text-dim text-center leading-tight max-w-[64px]">
            {t.theme}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function VotePreview() {
  return (
    <div className="space-y-6">
      {/* Hero explainer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
        className="bg-smoke/60 border border-ember/40 rounded-2xl p-5 text-center"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-2">
          How the audit works
        </p>
        <p className="font-display text-lg text-bone leading-snug mb-1">
          The crowd decides who stays.
        </p>
        <p className="text-dim text-xs leading-relaxed max-w-sm mx-auto">
          Every player submits a photo proof. You vote{" "}
          <span className="text-neon font-mono">HUMAN</span> or{" "}
          <span className="text-blood font-mono">SUS</span>. The majority verdict
          at quorum determines survival.
        </p>
      </motion.div>

      {/* Interactive mock submission */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Try it — demo card
        </p>
        <MockSubmissionCard />
      </div>

      {/* Three-step explainer */}
      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <StepCard key={step.title} step={step} index={i} />
        ))}
      </div>

      {/* Detective rank ladder */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Detective ranks — earn them with accurate votes
        </p>
        <RankLadder />
        <p className="text-dim text-[10px] font-mono mt-2 px-1 leading-relaxed">
          Hit 80% accuracy on 5+ votes → your votes count ×2.
        </p>
      </div>

      {/* Theme preview */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Daily themes — what players will prove
        </p>
        <ThemePreview />
      </div>

      {/* Stakes summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.smooth, delay: 0.3 }}
        className="bg-blood/5 border border-blood/30 rounded-2xl p-4 text-center"
      >
        <p className="font-display text-sm text-bone leading-snug mb-1">
          Vote wrong, and a real human loses their slot.
        </p>
        <p className="text-dim text-xs leading-relaxed">
          Vote right, and a human stays alive. The audit is what keeps the
          prize human-only.
        </p>
      </motion.div>
    </div>
  );
}
