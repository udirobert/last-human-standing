import { motion } from "framer-motion";
import { MascotAvatar } from "./Mascot.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * HistoryPreview — prelaunch educational briefing for the Player History screen.
 *
 * Before the game starts, PlayerHistory shows "Nothing logged yet" with a
 * coffee motif. That's a dead end — no explanation of what will appear here
 * or why it matters.
 *
 * This replaces it with:
 *   1. What the history screen tracks (check-ins, rank, survival)
 *   2. A mock check-in record showing what a Day 1 entry looks like
 *   3. The vote accuracy card preview
 *   4. Streak and progression explanation
 */

const MOCK_CHECKINS = [
  {
    rank: 3,
    survived: true,
    time: "09:14",
    distance: 240,
    theme: "AT A CAFÉ",
  },
  {
    rank: 12,
    survived: true,
    time: "08:42",
    distance: 1800,
    theme: "AT A PARK",
  },
  {
    rank: 27,
    survived: false,
    time: "14:20",
    distance: 500,
    theme: "AT A GYM",
  },
];

export default function HistoryPreview() {
  return (
    <div className="space-y-5">
      {/* Hero explainer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
        className="bg-smoke/60 border border-ember/40 rounded-2xl p-5 text-center"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-2">
          Your record
        </p>
        <p className="font-display text-lg text-bone leading-snug mb-1">
          Every check-in. Every verdict. Every streak.
        </p>
        <p className="text-dim text-xs leading-relaxed max-w-sm mx-auto">
          This screen tracks your daily check-ins — your rank, whether you
          survived the audit, and how far you traveled. Your vote accuracy
          appears here too, once you start judging other players.
        </p>
      </motion.div>

      {/* Mock vote accuracy card */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Vote accuracy (after you start auditing)
        </p>
        <div className="bg-smoke/80 border border-amber/30 rounded-2xl p-4 backdrop-blur-sm">
          <p className="font-mono text-amber text-[10px] tracking-widest uppercase mb-2">
            Your vote accuracy
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl text-amber leading-none tabular-nums">
              85%
            </span>
            <span className="font-mono text-dim text-xs tabular-nums">
              (17/20 correct)
            </span>
          </div>
          <p className="text-bone/55 text-[11px] font-body mt-2 leading-relaxed">
            How often the crowd agreed with the final ruling on submissions
            you voted on. Hit 80% on 5+ votes for jury weight x2.
          </p>
        </div>
        <p className="text-dim text-[10px] font-mono mt-2 px-1 text-center">
          Preview — your real stats appear after Day 1.
        </p>
      </div>

      {/* Mock check-in records */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          What your check-ins will look like
        </p>
        <div className="space-y-3">
          {MOCK_CHECKINS.map((ck, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: MOTION_DURATION.fast,
                ease: MOTION_EASE.smooth,
                delay: i * 0.08,
              }}
              className="bg-smoke/80 border border-ember/40 rounded-2xl p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <MascotAvatar status={ck.survived ? "alive" : "eliminated"} size={24} />
                  <p className="font-display text-lg text-bone">
                    {ck.survived ? "Survived" : "Out"} #{ck.rank}
                  </p>
                </div>
                <span className="font-mono text-xs text-dim tabular-nums">{ck.time}</span>
              </div>
              <div className="flex gap-3 text-xs font-mono text-dim">
                <span>{Math.round(ck.distance)}m</span>
                <span>{ck.theme}</span>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-dim text-[10px] font-mono mt-2 px-1 text-center">
          Preview — your real check-ins appear here once the game starts.
        </p>
      </div>

      {/* What gets tracked */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-1 px-1">
          What we track
        </p>
        {[
          { icon: "📊", title: "Rank at check-in", body: "Your position in the queue. Lower is better — first 25 provisionally survive." },
          { icon: "✅", title: "Survival verdict", body: "Whether the crowd voted you HUMAN or SUS. Survived or eliminated." },
          { icon: "📏", title: "Distance traveled", body: "How far you were from the theme location. Closer is more convincing." },
          { icon: "🔥", title: "Survival streak", body: "Consecutive days survived. Long streaks unlock achievements and jury visibility." },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: MOTION_DURATION.base,
              ease: MOTION_EASE.smooth,
              delay: i * 0.06,
            }}
            className="flex gap-3 items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-smoke border border-ember/40 flex items-center justify-center text-lg shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-bone mb-0.5">{item.title}</p>
              <p className="text-dim text-xs leading-relaxed">{item.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
