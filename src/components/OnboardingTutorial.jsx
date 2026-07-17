import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * OnboardingTutorial — quick walkthrough for new players showing the game loop.
 * Shows 4 key steps: check-in, vote, survive, win.
 * Appears in prelaunch panel to educate users before launch.
 */

const STEPS = [
  {
    emoji: "📸",
    title: "Daily check-in",
    description: "Each day, a new theme drops. Show your proof from anywhere on Earth.",
    color: "from-amber to-amber/60"
  },
  {
    emoji: "⚖️",
    title: "Community votes",
    description: "Review submissions. Vote HUMAN or SUS based on authenticity.",
    color: "from-neon to-neon/60"
  },
  {
    emoji: "🔥",
    title: "Survive the cut",
    description: "Top submissions advance. The field narrows each day. 50 → 1.",
    color: "from-blood to-blood/60"
  },
  {
    emoji: "🏆",
    title: "Last human wins",
    description: "Outlast everyone. Take the entire prize pool.",
    color: "from-amber via-neon to-blood"
  }
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
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}>
                  <span className="text-3xl">{step.emoji}</span>
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

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              idx === currentStep
                ? "bg-neon w-6"
                : "bg-ember/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
