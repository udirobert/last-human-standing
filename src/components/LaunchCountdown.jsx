import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Dramatic launch countdown. 4 big number blocks (DAYS / HOURS /
 * MINS / SECS) with a pulsing colon, like a rocket launch clock.
 * Used on the Onboarding welcome screen.
 */
function diff(targetIso) {
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s, done: ms === 0 };
}

export default function LaunchCountdown({ targetIso, className = "" }) {
  const [t, setT] = useState(() => diff(targetIso));

  useEffect(() => {
    if (!targetIso) return undefined;
    const id = setInterval(() => setT(diff(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;

  const blocks = [
    { label: "DAYS", value: t.d },
    { label: "HRS", value: t.h },
    { label: "MIN", value: t.m },
    { label: "SEC", value: t.s },
  ];

  return (
    <div className={className}>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono text-amber text-[10px] tracking-widest uppercase text-center mb-2"
      >
        Day 1 launch
      </motion.p>
      <div className="flex items-center justify-center gap-1.5">
        {blocks.map((b, i) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <motion.div
              key={`${b.label}-${b.value}`}
              initial={{ scale: 1.06, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="bg-ash/70 border border-amber/30 rounded-xl px-2 py-2 min-w-[3.2rem] text-center shadow-[0_0_18px_rgba(255,184,0,0.15)]"
            >
              <p className="font-display text-3xl text-bone leading-none tabular-nums">
                {String(b.value).padStart(2, "0")}
              </p>
              <p className="font-mono text-amber/70 text-[8px] tracking-widest mt-1">
                {b.label}
              </p>
            </motion.div>
            {i < blocks.length - 1 && (
              <span className="text-amber/40 font-mono text-lg select-none">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
