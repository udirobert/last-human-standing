import { motion } from "framer-motion";
import { TODAY_THEME, findTheme, COHORT_SCHEDULE } from "../data/game";
import ThemeMotif from "./ui/ThemeMotif.jsx";
import InfoStrip from "./ui/InfoStrip.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";
import { survivalRule } from "../lib/copy.js";

/**
 * CheckInPreview — prelaunch briefing for the Check-in screen, compact.
 *
 * One mock riddle card shows what a day looks like; a tight 4-step strip
 * covers the flow; the shrinking-cap bar chart carries the stakes. No big
 * hero explainer — the header is two lines.
 */

const STEPS = [
  { icon: "📸", title: "Snap your proof", body: "You + your answer in frame. No old photos, no stock." },
  { icon: "📍", title: "Share your GPS", body: "Attached for verification, never shown unless you opt in." },
  { icon: "⏱️", title: "Use the window", body: survivalRule(25) },
  { icon: "⚖️", title: "Face the audit", body: "The crowd votes HUMAN or SUS. Majority SUS = out." },
];

export default function CheckInPreview() {
  const themeData = findTheme(TODAY_THEME.theme) || TODAY_THEME;

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
        className="text-center"
      >
        <p className="font-mono text-[10px] text-neon uppercase tracking-widest mb-1">
          Daily check-in
        </p>
        <p className="font-display text-xl text-bone leading-snug">
          Prove you're human. Stay alive.
        </p>
      </motion.div>

      {/* Mock riddle card */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Today's riddle (preview)
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth, delay: 0.1 }}
          className="bg-smoke border border-neon/20 rounded-3xl p-5 relative overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 opacity-25 pointer-events-none" aria-hidden>
            <ThemeMotif emoji={themeData.emoji} size={80} label={TODAY_THEME.theme} />
          </div>
          <div className="flex items-center gap-3 mb-2 relative">
            <ThemeMotif emoji={themeData.emoji} size={52} label={TODAY_THEME.theme} className="-my-1 shrink-0" />
            <p className="font-display text-2xl text-bone">{TODAY_THEME.theme}</p>
          </div>
          <p className="text-dim text-sm font-body relative mb-3">{themeData.description}</p>

          <div className="grid grid-cols-2 gap-3 relative">
            <div>
              <p className="font-mono text-[10px] text-neon uppercase tracking-wider mb-1">Counts</p>
              <ul className="space-y-1">
                {themeData.counts.map((c) => (
                  <li key={c} className="text-bone/70 text-[11px] font-body flex items-start gap-1.5">
                    <span className="text-neon mt-0.5">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] text-blood uppercase tracking-wider mb-1">Doesn't</p>
              <ul className="space-y-1">
                {themeData.doesnt.map((c) => (
                  <li key={c} className="text-bone/50 text-[11px] font-body flex items-start gap-1.5">
                    <span className="text-blood mt-0.5">✗</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
        <p className="text-dim text-[10px] font-mono mt-2 px-1 text-center">
          Preview — the real riddle is assigned at launch.
        </p>
      </div>

      {/* Four-step flow — tight strip */}
      <InfoStrip items={STEPS} />

      {/* Shrinking cap — the stakes, as a chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.smooth, delay: 0.3 }}
        className="bg-smoke/60 border border-ember/40 rounded-2xl p-4"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-3 text-center">
          The cap shrinks every day
        </p>
        <div className="flex items-end justify-between gap-1">
          {COHORT_SCHEDULE.map((d, i) => (
            <motion.div
              key={d.day}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth, delay: 0.35 + i * 0.07 }}
              style={{ originY: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-8 rounded-full bg-amber/20 border border-amber/40 flex items-end justify-center"
                style={{ height: `${Math.max(10, d.cap * 0.8)}px` }}
              >
                <span className="font-display text-[10px] text-amber tabular-nums pb-1">{d.cap}</span>
              </div>
              <span className="font-mono text-[9px] text-dim">D{d.day}</span>
            </motion.div>
          ))}
        </div>
        <p className="text-dim text-[10px] font-mono mt-3 text-center leading-relaxed">
          Day 1 everyone in the window is eligible — overflow goes to the seed
          lottery. Day 5 one human remains.
        </p>
      </motion.div>

      <p className="text-dim text-xs font-body text-center leading-relaxed">
        Miss the window and you're out. Check in within it, check in honest —
        the audit decides who stays, but you have to be eligible first.
      </p>
    </div>
  );
}
