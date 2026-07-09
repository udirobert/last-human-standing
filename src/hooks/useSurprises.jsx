import { useState, useEffect, useCallback } from 'react';

// Random survival tips database
const TIPS = [
  "Trust no one. Especially that survivor in the corner.",
  "If it seems too good to be true, it's probably a trap.",
  "Your check-in is your lifeline. Never miss one.",
  "Coalitions win wars. Find allies wisely.",
  "The safest seat at the table is the one you're willing to burn.",
  "When in doubt, observe. Knowledge is survival.",
  "Every vote matters. Choose wisely.",
  "The desert rewards patience.",
  "Never reveal your strategy until you must.",
  "Today's ally could be tomorrow's threat.",
  "Water is life. Guard your resources.",
  "The shadows hide more than just survivors.",
  "A single decision can change everything.",
  "Trust the process. Trust yourself.",
  "The game doesn't end when you think it does.",
];

// Easter egg triggers
const EASTER_EGGS = {
  tap_logo_5: { required: 5, message: '🤫 Secret unlocked: The whispers say "patience wins"', reward: 'hidden_feature' },
  survive_100_rounds: { required: 100, message: '💀 You\'ve earned the title: Death\'s Favorite', reward: 'badge' },
};

export function useSurvivalTips() {
  const [currentTip, setCurrentTip] = useState(null);

  const showRandomTip = useCallback(() => {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    setCurrentTip(tip);
  }, []);

  const dismissTip = useCallback(() => {
    setCurrentTip(null);
  }, []);

  return { currentTip, showRandomTip, dismissTip };
}

// Tip toast component
export function TipToast({ tip, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="tip-toast fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up px-4">
      <div className="bg-smoke border border-ember rounded-xl px-5 py-3 shadow-2xl max-w-sm">
        <div className="text-xs text-amber font-mono tracking-widest uppercase mb-1">💀 Survival tip</div>
        <div className="text-bone text-sm font-body">{tip}</div>
      </div>
    </div>
  );
}

// Easter egg tracker
export function useEasterEgg(eggId) {
  const [count, setCount] = useState(() => {
    try {
      const stored = localStorage.getItem(`easter_egg_${eggId}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [unlocked, setUnlocked] = useState(false);

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(`easter_egg_${eggId}`, next.toString());
      const egg = EASTER_EGGS[eggId];
      if (egg && next >= egg.required) {
        setUnlocked(true);
      }
      return next;
    });
  }, [eggId]);

  return { count, increment, unlocked, requirement: EASTER_EGGS[eggId]?.required };
}

// Secret message component
export function SecretMessage({ message, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-amber-500/30 rounded-2xl p-8 max-w-sm text-center">
        <div className="text-4xl mb-4">🔮</div>
        <div className="text-amber-400 text-lg font-bold mb-2">Secret Unlocked!</div>
        <div className="text-gray-300 mb-6">{message}</div>
        <button
          onClick={onDismiss}
          className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// Particle effects for celebrations
export function useParticles() {
  const [particles, setParticles] = useState([]);

  const burst = useCallback((origin = { x: 50, y: 50 }, count = 20) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: origin.x,
      y: origin.y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 10,
      color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3'][Math.floor(Math.random() * 4)],
      size: Math.random() * 6 + 2,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  }, []);

  return { particles, burst };
}

// Surprising notification (like "Someone is watching your profile...")
export function useSuspenseNotification() {
  const [notification, setNotification] = useState(null);

  const show = useCallback((message) => {
    setNotification(message);
  }, []);

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, show, dismiss };
}

export function SuspenseNotification({ notification, onDismiss }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-red-900/80 border border-red-500/50 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-200 text-sm">{notification}</span>
      </div>
    </div>
  );
}

// Streak fire animation
export function StreakFire({ count }) {
  if (count < 3) return null;
  
  return (
    <div className="relative inline-flex items-center">
      <span className="text-2xl animate-pulse">🔥</span>
      <span className="ml-1 text-amber-400 font-bold">{count}</span>
      {count >= 7 && <span className="ml-1 text-xs text-amber-300">ON FIRE!</span>}
    </div>
  );
}