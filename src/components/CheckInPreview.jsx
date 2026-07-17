import { motion } from "framer-motion";
import { TODAY_THEME, findTheme, DAILY_THEMES } from "../data/game";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * CheckInPreview — prelaunch educational briefing for the Check-in screen.
 *
 * Before the game starts, CheckIn shows a clock emoji and "No round set
 * for today yet." That's a dead end for a user exploring the interface.
 *
 * This replaces it with:
 *   1. What check-in is and why it matters (survival cap, first-come)
 *   2. A mock theme card showing what today's mission will look like
 *   3. The proof requirements (photo + GPS, what counts / doesn't)
 *   4. The check-in flow steps (snap → submit → await verdict)
 *   5. The stakes: miss the cap and you're out
 */

const STEPS = [
  {
    icon: "📸",
    title: "Snap your proof",
    body: "Get to the theme location. Take a photo with you and the place clearly in frame. No old photos, no stock images.",
  },
  {
    icon: "📍",
    title: "Share your GPS",
    body: "Your location is attached as proof you're really there. It's only used for verification — never shown to other players unless you opt in.",
  },
  {
    icon: "⏱️",
    title: "Beat the cap",
    body: "The first 25 check-ins provisionally survive. After that, the survival cap shrinks each day. Speed matters as much as honesty.",
  },
  {
    icon: "⚖️",
    title: "Face the audit",
    body: "Your photo goes to the Vote tab. The crowd votes HUMAN or SUS. If the majority says SUS, you're eliminated — even if you were honest.",
  },
];

export default function CheckInPreview() {
  const themeData = findTheme(TODAY_THEME.theme) || TODAY_THEME;

  return (
    <div className="space-y-5">
      {/* Hero explainer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
        className="bg-smoke/60 border border-ember/40 rounded-2xl p-5 text-center"
      >
        <p className="font-mono text-[10px] text-neon uppercase tracking-widest mb-2">
          Daily check-in
        </p>
        <p className="font-display text-lg text-bone leading-snug mb-1">
          Prove you're human. Stay alive.
        </p>
        <p className="text-dim text-xs leading-relaxed max-w-sm mx-auto">
          Each day has a theme. Get there, snap a
          photo with GPS, and submit before the survival cap fills. The
          crowd audits your proof. Survive or get eliminated.
        </p>
      </motion.div>

      {/* Mock theme card */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Today's theme (preview)
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth, delay: 0.1 }}
          className="bg-smoke border border-neon/20 rounded-3xl p-6 relative overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 opacity-25 pointer-events-none" aria-hidden>
            <ThemeMotif emoji={themeData.emoji} size={88} label={TODAY_THEME.theme} />
          </div>
          <p className="font-mono text-neon text-xs tracking-widest uppercase mb-1 relative">
            Today's mission
          </p>
          <div className="flex items-center gap-3 mb-2 relative">
            <ThemeMotif emoji={themeData.emoji} size={64} label={TODAY_THEME.theme} className="-my-2 shrink-0" />
            <p className="font-display text-2xl text-bone">{TODAY_THEME.theme}</p>
          </div>
          <p className="text-dim text-sm font-body relative mb-4">{themeData.description}</p>

          {/* What counts */}
          <div className="space-y-2 relative">
            <div>
              <p className="font-mono text-[10px] text-neon uppercase tracking-wider mb-1">Counts</p>
              <ul className="space-y-1">
                {themeData.counts.map((c) => (
                  <li key={c} className="text-bone/70 text-xs font-body flex items-start gap-2">
                    <span className="text-neon mt-0.5">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] text-blood uppercase tracking-wider mb-1">Doesn't count</p>
              <ul className="space-y-1">
                {themeData.doesnt.map((c) => (
                  <li key={c} className="text-bone/50 text-xs font-body flex items-start gap-2">
                    <span className="text-blood mt-0.5">✗</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
        <p className="text-dim text-[10px] font-mono mt-2 px-1 text-center">
          Preview — the real theme is assigned when the game goes live.
        </p>
      </div>

      {/* Four-step flow */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-1 px-1">
          How check-in works
        </p>
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: MOTION_DURATION.base,
              ease: MOTION_EASE.smooth,
              delay: i * 0.08,
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
        ))}
      </div>

      {/* Survival cap visual */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.smooth, delay: 0.3 }}
        className="bg-smoke/60 border border-ember/40 rounded-2xl p-4"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-3 text-center">
          The survival cap shrinks every day
        </p>
        <div className="flex items-center justify-between gap-1">
          {[
            { day: 1, cap: 50 },
            { day: 2, cap: 40 },
            { day: 3, cap: 20 },
            { day: 4, cap: 8 },
            { day: 5, cap: 3 },
          ].map((d, i) => (
            <div key={d.day} className="flex flex-col items-center gap-1">
              <span className="font-mono text-[9px] text-dim">Day {d.day}</span>
              <div
                className="w-8 rounded-full bg-amber/20 border border-amber/40 flex items-end justify-center"
                style={{ height: `${d.cap * 0.7}px` }}
              >
                <span className="font-display text-[10px] text-amber tabular-nums pb-1">{d.cap}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-dim text-[10px] font-mono mt-3 text-center leading-relaxed">
          Day 1: first 50 survive. Day 5: only 3 remain. The last verified human takes everything.
        </p>
      </motion.div>

      {/* Stakes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.smooth, delay: 0.4 }}
        className="bg-blood/5 border border-blood/30 rounded-2xl p-4 text-center"
      >
        <p className="font-display text-sm text-bone leading-snug mb-1">
          Miss the cap, and you're out.
        </p>
        <p className="text-dim text-xs leading-relaxed">
          Check in early. Check in honest. The audit decides who stays —
          but you have to be in the first 25 to even have a chance.
        </p>
      </motion.div>
    </div>
  );
}
