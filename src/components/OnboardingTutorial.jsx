import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeMotif from "./ui/ThemeMotif.jsx";

/**
 * OnboardingTutorial — quick walkthrough for new players showing the game loop.
 * Painted motifs only — no chrome emoji glyphs (ART_DIRECTION).
 */

const STEPS = [
  {
    emoji: "☕",
    title: "Daily check-in",
    description: "Each day, a new riddle drops. Answer it with a proof from anywhere on Earth.",
    accent: "border-amber/40 bg-amber/10",
  },
  {
    emoji: "🌅",
    title: "Community votes",
    description: "Review submissions. Vote HUMAN or SUS based on authenticity.",
    accent: "border-neon/40 bg-neon/10",
  },
  {
    emoji: "🍜",
    title: "Survive the cut",
    description: "Top submissions advance. The field narrows each day. 50 → 1.",
    accent: "border-blood/40 bg-blood/10",
  },
  {
    emoji: "🌳",
    title: "Last human wins",
    description: "Outlast everyone. Take the entire prize pool.",
    accent: "border-amber/40 bg-amber/10",
  },
];

export default function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % STEPS.length;
        if (next === 0) setIsPlaying(false);
        return next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const startTutorial = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  return (
    <div className="border border-neon/30 rounded-3xl p-5 bg-smoke/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-neon text-[10px] tracking-widest uppercase">
          How it works
        </p>
        {!isPlaying && (
          <button
            type="button"
            onClick={startTutorial}
            className="font-mono text-[10px] text-amber hover:text-neon transition-colors"
          >
            Watch →
          </button>
        )}
      </div>

      <div className="relative min-h-[140px]">
        <AnimatePresence mode="wait">
          {STEPS.map((step, idx) => {
            if (idx !== currentStep) return null;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border ${step.accent}`}>
                  <ThemeMotif emoji={step.emoji} size={48} label={step.title} />
                </div>
                <div>
                  <p className="font-display text-bone text-base mb-1">
                    {step.title}
                  </p>
                  <p className="text-dim text-xs font-body leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex gap-1.5 mt-4 justify-center">
        {STEPS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(idx);
            }}
            className={`h-1.5 rounded-full transition-all ${
              idx === currentStep ? "w-5 bg-amber" : "w-1.5 bg-bone/20"
            }`}
            aria-label={`Step ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
