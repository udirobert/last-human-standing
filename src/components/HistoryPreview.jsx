import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { MascotAvatar } from "./Mascot.jsx";
import InfoStrip from "./ui/InfoStrip.jsx";
import { MOTION_DURATION, MOTION_EASE } from "../lib/motion.js";

/**
 * HistoryPreview — prelaunch briefing for the Player History screen, compact.
 *
 * A mock vote-accuracy card and three mock check-in records show what lands
 * here; a tight strip covers what gets tracked. No big hero explainer.
 */

const MOCK_CHECKINS = [
  { survived: true, time: "09:14", distance: 240, theme: "THE GATHERING" },
  { survived: true, time: "08:42", distance: 1800, theme: "THE WILD" },
  { survived: false, time: "14:20", distance: 500, theme: "THE BOND" },
];

const TRACKED = [
  { icon: "📊", title: "Check-in & eligibility", body: "When you checked in and whether you were eligible. Everyone in the window is eligible — overflow goes to the seed lottery." },
  { icon: "✅", title: "Survival verdict", body: "Drawn or not drawn; HUMAN or SUS from the crowd. Survived or eliminated." },
  { icon: "📏", title: "Distance traveled", body: "From the round's anchor point, if set. GPS plausibility — not scored." },
  { icon: "🔥", title: "Survival streak", body: "Consecutive days survived. Unlocks achievements and jury visibility." },
];

/** Small count-up so the mock accuracy number feels alive, not static. */
function CountUp({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: MOTION_DURATION.slow,
      ease: MOTION_EASE.smooth,
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [to]);
  return (
    <span className="tabular-nums">
      {val}
      {suffix}
    </span>
  );
}

export default function HistoryPreview() {
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.smooth }}
        className="text-center"
      >
        <p className="font-mono text-[10px] text-amber uppercase tracking-widest mb-1">
          Your record
        </p>
        <p className="font-display text-xl text-bone leading-snug">
          Every check-in. Every verdict. Every streak.
        </p>
      </motion.div>

      {/* Mock vote accuracy card */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          Vote accuracy (after you start auditing)
        </p>
        <div className="bg-smoke/80 border border-amber/30 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl text-amber leading-none">
              <CountUp to={85} suffix="%" />
            </span>
            <span className="font-mono text-dim text-xs tabular-nums">(17/20 correct)</span>
          </div>
          <p className="text-bone/55 text-[11px] font-body mt-2 leading-relaxed">
            How often the crowd agreed with the final ruling on submissions you
            voted on. Hit 80% on 5+ votes for jury weight ×2.
          </p>
        </div>
      </div>

      {/* Mock check-in records */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-2 px-1">
          What your check-ins will look like
        </p>
        <div className="space-y-2.5">
          {MOCK_CHECKINS.map((ck, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth, delay: i * 0.08 }}
              className="bg-smoke/80 border border-ember/40 rounded-2xl px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MascotAvatar status={ck.survived ? "alive" : "eliminated"} size={22} />
                  <p className="font-display text-base text-bone">
                    {ck.survived ? "Survived the draw" : "Not drawn"}
                  </p>
                </div>
                <span className="font-mono text-xs text-dim tabular-nums">{ck.time}</span>
              </div>
              <div className="flex gap-3 text-[11px] font-mono text-dim mt-0.5">
                <span>{Math.round(ck.distance)}m</span>
                <span>{ck.theme}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* What gets tracked — tight strip */}
      <div>
        <p className="font-mono text-[10px] text-dim uppercase tracking-widest mb-1 px-1">
          What we track
        </p>
        <InfoStrip items={TRACKED} />
      </div>

      <p className="text-dim text-[10px] font-mono text-center">
        Preview — your real stats appear after Day 1.
      </p>
    </div>
  );
}
