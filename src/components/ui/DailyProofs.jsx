import { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DAILY_THEMES, COHORT_SCHEDULE } from "../../data/game";
import ThemeMotif from "./ThemeMotif.jsx";
import ThemeWorld from "./ThemeWorld.jsx";

/**
 * DailyProofs — the daily-theme wheel for the landing narrative
 * (docs/ART_DIRECTION.md). Every morning a new real-world theme drops; this
 * shows the whole hand-painted deck so a visitor instantly gets the game, and
 * surfaces the painted theme motifs pre-launch (the in-game check-in card is
 * unreachable until launch).
 *
 * Tapping a card dives into its ThemeWorld — the painted motif shared-element-
 * morphs up into the detail hero (framer `layoutId`). That same detail hero is
 * where the Phase-1 living gouache clip will live, and the interaction is reused
 * for the in-game check-in reveal.
 */

const SHORT = {
  "AT A CAFÉ": "a café",
  "AT A PARK": "a park",
  "AT A GYM": "the gym",
  "WITH A FRIEND": "a friend",
  "OUTSIDE AT SUNRISE": "sunrise",
  "AT A BOOKSTORE": "a bookstore",
  "EATING SOMETHING": "a meal",
  "ON PUBLIC TRANSIT": "transit",
  "AT A GROCERY STORE": "groceries",
  "AT A BEACH OR WATER": "the water",
};

export default function DailyProofs() {
  const [selected, setSelected] = useState(null);
  const reduce = useReducedMotion();
  const idFor = (t) => `theme-world-${t.id}`;
  
  // Shuffle day assignments once on mount to create mystery — players see all
  // themes with day labels, but the mapping is randomised. Only re-shuffles when
  // motion is not reduced; under reduced motion the assignment is stable for the
  // session so screen-reader users aren't surprised by changing labels.
  const [shuffledSchedule, setShuffledSchedule] = useState(() => {
    const picked = [...DAILY_THEMES].sort(() => Math.random() - 0.5).slice(0, 5);
    return picked.map((theme, i) => ({
      ...COHORT_SCHEDULE[i],
      theme: theme.theme,
      emoji: theme.emoji,
    }));
  });
  
  useEffect(() => {
    if (reduce) return;
    let timeout;
    const scheduleNext = () => {
      timeout = setTimeout(() => {
        setShuffledSchedule(() => {
          const picked = [...DAILY_THEMES].sort(() => Math.random() - 0.5).slice(0, 5);
          return picked.map((theme, i) => ({
            ...COHORT_SCHEDULE[i],
            theme: theme.theme,
            emoji: theme.emoji,
          }));
        });
        scheduleNext();
      }, 5000 + Math.random() * 3000);
    };
    scheduleNext();
    return () => clearTimeout(timeout);
  }, [reduce]);

  return (
    <section className="w-full max-w-[860px] mx-auto px-5">
      <div className="text-center mb-6">
        <p className="font-mono text-amber/90 uppercase text-[11px] tracking-[0.2em]">Every morning</p>
        <h2
          className="font-display text-bone tracking-wide mt-1"
          style={{ fontSize: "clamp(30px,5vw,52px)", lineHeight: 0.95 }}
        >
          A new proof you're human
        </h2>
        <p className="font-body text-dim text-sm sm:text-base mt-2 max-w-md mx-auto">
          Possible proofs you might get. Day assignments stay secret until each morning — tap a card to see what it asks for.
        </p>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 list-none p-0 m-0">
        {DAILY_THEMES.map((t) => {
          // Match against the shuffled schedule (not the real one)
          // so day labels keep moving around, creating mystery
          const scheduled = shuffledSchedule.find((s) => s.theme === t.theme);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelected(t)}
                className={`w-full h-full flex flex-col items-center justify-end gap-1.5 rounded-2xl bg-smoke/50 border py-4 px-2 transition-[transform,border-color] duration-150 active:scale-[0.96] hover:border-ember relative ${
                  scheduled ? "border-amber/50 bg-amber/5" : "border-ember/40"
                }`}
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                aria-label={scheduled
                  ? `Day ${scheduled.day} · ${scheduled.dayLabel} · ${t.theme} — see details`
                  : `${t.theme} — see details`}
              >
                {/* Day label overlay — top-left corner */}
                {scheduled && (
                  <motion.span
                    key={scheduled.day + t.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-amber/20 border border-amber/40 px-1.5 py-0.5"
                  >
                    <span className="font-mono text-amber text-[8px] tracking-widest uppercase">
                      DAY {scheduled.day}
                    </span>
                    <span className="font-mono text-dim text-[8px]">·</span>
                    <span className="font-mono text-dim text-[8px] uppercase">
                      {scheduled.dayLabel}
                    </span>
                  </motion.span>
                )}
                {/* Hidden while open so the morphing hero isn't duplicated behind the modal. */}
                <motion.div
                  layout={!reduce}
                  layoutId={idFor(t)}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
                  style={{ opacity: selected?.id === t.id ? 0 : 1 }}
                >
                  <ThemeMotif emoji={t.emoji} size={56} label={t.theme} />
                </motion.div>
                <span className="font-mono text-dim text-[10px] tracking-widest uppercase text-center leading-tight">
                  {SHORT[t.theme] || t.theme}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {selected && (
          <ThemeWorld
            key={selected.id}
            theme={selected}
            layoutId={idFor(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
