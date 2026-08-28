import { useState } from "react";
import { motion } from "framer-motion";
import { TODAY_THEME, findTheme } from "../data/game";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import VoteBar from "./ui/VoteBar.jsx";
import InfoStrip from "./ui/InfoStrip.jsx";
import { MascotAvatar } from "./Mascot.jsx";
import { ritualFeel } from "../lib/ritualFeel.js";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * VotePreview — prelaunch briefing for the Audit tab, compact + learn-by-doing.
 *
 * One interactive mock card is the whole lesson: tap HUMAN or SUS, feel the
 * verdict, see the tally move. The three-step loop and detective ladder sit
 * underneath as tight strips. No literal-theme wall — the game runs on
 * riddles now, and the landing's DailyProofs already shows place types.
 */

const STEPS = [
  { icon: "📸", title: "They answer", body: "A photo + one line on why it fits the riddle." },
  { icon: "⚖️", title: "You judge", body: "Vote HUMAN or SUS against the revealed criteria." },
  { icon: "🔥", title: "Verdict lands", body: "Majority at quorum. Flagged = out, next player in." },
];

const RANKS = [
  { votes: "0", label: "Rookie", emoji: "🌱" },
  { votes: "5", label: "Detective", emoji: "🔍" },
  { votes: "10", label: "Juror", emoji: "📋" },
  { votes: "10+", label: "Bloodhound", emoji: "🐕" },
  { votes: "20+", label: "Sherlock", emoji: "🏆" },
];

function MockSubmissionCard() {
  const [vote, setVote] = useState(null);

  const handleVote = (type) => {
    if (vote) return;
    setVote(type);
    ritualFeel(type === "real" ? "voteHuman" : "voteSus");
  };

  const themeEmoji = (findTheme(TODAY_THEME.theme) || TODAY_THEME).emoji;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
      className="relative z-10 bg-smoke border border-ember rounded-3xl overflow-hidden"
    >
      <div className="w-full aspect-[4/5] max-h-[44vh] flex items-center justify-center bg-ash/80 relative">
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
          My answer, because… this is where it clicked for me.
        </p>

        <VoteBar real={3} fake={3} size="hero" className="mt-3" />

        <div className="mt-2 h-1 bg-ash rounded-full overflow-hidden">
          <div className="h-full bg-amber/70 rounded-full" style={{ width: "60%" }} />
        </div>
        <p className="text-dim text-[10px] font-mono mt-1">
          Quorum 6/10
          {vote && ` · you voted ${vote === "real" ? "HUMAN" : "SUS"}`}
        </p>

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

        {vote && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 py-2 px-3 rounded-xl text-center font-mono text-xs bg-amber/10 border border-amber/30 text-amber"
          >
            {vote === "real"
              ? "HUMAN — if the crowd agrees, they survive the day."
              : "SUS — if the crowd agrees, they're out."}
            <span className="block text-dim text-[10px] mt-0.5">
              Demo card · real submissions appear at launch
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function VotePreview() {
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
        className="text-center"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-1">
          The audit
        </p>
        <p className="font-display text-xl text-bone leading-snug">
          The crowd decides who stays.
        </p>
      </motion.div>

      <MockSubmissionCard />

      {/* Three-step loop — tight strip */}
      <InfoStrip items={STEPS} />

      {/* Detective ladder */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Detective ranks · 80% accuracy on 5+ votes = ×2 weight
        </p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {RANKS.map((rank, i) => (
            <div key={rank.label} className="flex items-center gap-1 shrink-0">
              <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl bg-smoke/60 border border-ember/30 min-w-[64px]">
                <span className="text-base">{rank.emoji}</span>
                <span className="font-display text-[10px] text-bone leading-tight">{rank.label}</span>
                <span className="font-mono text-[8px] text-dim tabular-nums">{rank.votes}</span>
              </div>
              {i < RANKS.length - 1 && <span className="text-ember/40 text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      <p className="text-dim text-xs font-body text-center leading-relaxed">
        Vote wrong and a real human loses their slot. Vote right and they stay.
        The audit is what keeps the prize human-only.
      </p>
    </div>
  );
}
