import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeMotif from "./ThemeMotif.jsx";
import { proofSceneDataUri } from "./proofSceneData.js";
import MascotGuide from "./MascotGuide.jsx";
import { useDelight } from "../DelightProvider.jsx";
import { GOUACHE as P } from "./gouachePalette.js";

/**
 * GameplayLoopDemo — auto-playing animated sequence showing the core loop.
 *
 * Replaces the need for a video demo by animating the actual game mechanics
 * in-place: theme drops → proof submitted → crowd votes → survive or cut.
 * Three phases cycle on a timer, giving the user a visual taste of the game
 * before they commit.
 *
 * Used in onboarding step 0 (landing) between "How it works" and the stakes.
 */
const PHASES = [
  {
    id: "theme",
    label: "THEME DROPS",
    duration: 2000,
  },
  {
    id: "proof",
    label: "YOU CHECK IN",
    duration: 2000,
  },
  {
    id: "vote",
    label: "CROWD VOTES",
    duration: 2500,
  },
  {
    id: "result",
    label: "YOU SURVIVE",
    duration: 2000,
  },
];

export default function GameplayLoopDemo() {
  const { handleMascotClick } = useDelight();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [voteReal, setVoteReal] = useState(0);
  const [voteFake, setVoteFake] = useState(0);
  const phase = PHASES[phaseIdx];

  useEffect(() => {
    // Reset votes when entering vote phase
    if (phase.id === "vote") {
      setVoteReal(0);
      setVoteFake(0);
      const realInterval = setInterval(() => {
        setVoteReal((v) => Math.min(v + 1, 12));
      }, 120);
      const fakeInterval = setInterval(() => {
        setVoteFake((v) => Math.min(v + 1, 2));
      }, 400);
      return () => {
        clearInterval(realInterval);
        clearInterval(fakeInterval);
      };
    }
    // Advance to next phase
    const timer = setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length);
    }, phase.duration);
    return () => clearTimeout(timer);
  }, [phaseIdx, phase.id, phase.duration]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone-frame mockup */}
      <div className="relative bg-smoke/80 border border-ember/40 rounded-3xl overflow-hidden backdrop-blur-sm" style={{ aspectRatio: "9/16", maxHeight: "420px" }}>
        {/* Phase label — top bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 py-2 bg-ash/60 backdrop-blur-sm">
          <span className="font-mono text-amber text-[9px] tracking-widest uppercase">
            {phase.label}
          </span>
          <div className="flex gap-1">
            {PHASES.map((p, i) => (
              <span
                key={p.id}
                className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                  i === phaseIdx ? "w-4 bg-amber" : i < phaseIdx ? "w-2 bg-amber/40" : "w-2 bg-bone/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="absolute inset-0 pt-10 pb-3 px-3 flex flex-col">
          <AnimatePresence mode="wait">
            {/* Phase 1: Theme drops */}
            {phase.id === "theme" && (
              <motion.div
                key="theme"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex-1 flex flex-col items-center justify-center gap-3"
              >
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
                >
                  <ThemeMotif emoji="🚇" size={80} label="transit" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="font-display text-2xl text-bone text-center leading-tight"
                >
                  ON PUBLIC TRANSIT
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="font-mono text-dim text-[10px] tracking-widest uppercase text-center"
                >
                  Day 1 · 50 → 25
                </motion.p>
              </motion.div>
            )}

            {/* Phase 2: Check in — proof photo */}
            {phase.id === "proof" && (
              <motion.div
                key="proof"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="flex-1 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-ash/80 text-bone border border-ember/50">
                    @you
                  </span>
                  <span className="font-mono text-[9px] text-neon tracking-widest">CHECKED IN</span>
                </div>
                <div className="flex-1 rounded-xl overflow-hidden border border-ember/30 relative">
                  <img
                    src={proofSceneDataUri({ scene: "transit", seed: 99, width: 300, height: 400 })}
                    alt="your proof"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-ash/90 to-transparent">
                    <p className="font-body text-bone/90 text-[11px] leading-snug">Line 3. Standing room only.</p>
                  </div>
                </div>
                <p className="font-mono text-[9px] text-dim text-center">GPS shared · 14:32</p>
              </motion.div>
            )}

            {/* Phase 3: Crowd votes */}
            {phase.id === "vote" && (
              <motion.div
                key="vote"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-4"
              >
                <p className="font-display text-xl text-bone text-center">The crowd decides</p>
                {/* Vote tally — animated count up */}
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-neon text-sm w-16">HUMAN</span>
                    <div className="flex-1 h-6 bg-ash rounded-full overflow-hidden border border-neon/30">
                      <motion.div
                        className="h-full bg-neon/30"
                        animate={{ width: `${(voteReal / 14) * 100}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                    <span className="font-mono text-neon text-sm tabular-nums w-6 text-right">{voteReal}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-blood text-sm w-16">SUS</span>
                    <div className="flex-1 h-6 bg-ash rounded-full overflow-hidden border border-blood/30">
                      <motion.div
                        className="h-full bg-blood/30"
                        animate={{ width: `${(voteFake / 14) * 100}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                    <span className="font-mono text-blood text-sm tabular-nums w-6 text-right">{voteFake}</span>
                  </div>
                </div>
                {/* Floating vote particles */}
                <div className="relative w-full h-12">
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 20, x: 20 + i * 50 }}
                      animate={{ opacity: [0, 1, 0], y: -10 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute font-mono text-[10px]"
                      style={{ color: i < 4 ? P.leaf : P.terracotta }}
                    >
                      {i < 4 ? "✓ HUMAN" : "? SUS"}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase 4: Result — survive */}
            {phase.id === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-3"
              >
                {/* Pulse rings */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0.4 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute w-16 h-16 rounded-full border-2 border-neon"
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="w-16 h-16 rounded-full bg-neon/15 border-2 border-neon flex items-center justify-center"
                  >
                    <ThemeMotif emoji="🌅" size={40} label="survived" />
                  </motion.div>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-display text-3xl text-bone leading-none"
                >
                  RANK #14
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="font-mono text-neon text-[10px] tracking-widest uppercase"
                >
                  Day 1 · Survived
                </motion.p>
                <MascotGuide
                  variant="celebrating"
                  size={36}
                  message="One day down."
                  position="top"
                  interactive
                  onMascotClick={handleMascotClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Caption below the phone */}
      <p className="font-mono text-dim text-[10px] tracking-widest uppercase text-center mt-3">
        the loop · theme → proof → vote → survive
      </p>
    </div>
  );
}
