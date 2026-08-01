import { useState, useEffect, useCallback } from 'react';
import { SURVIVAL_TIPS } from '../lib/copy.js';
import Mascot from '../components/Mascot.jsx';

// Easter egg triggers
const EASTER_EGGS = {
  tap_logo_5: { required: 5, message: '🤫 Secret unlocked: The whispers say "patience wins"', reward: 'hidden_feature' },
  survive_100_rounds: { required: 100, message: '💀 You\'ve earned the title: Death\'s Favorite', reward: 'badge' },
};

export function useSurvivalTips() {
  const [currentTip, setCurrentTip] = useState(null);

  const showRandomTip = useCallback(() => {
    const tip = SURVIVAL_TIPS[Math.floor(Math.random() * SURVIVAL_TIPS.length)];
    setCurrentTip(tip);
  }, []);

  const dismissTip = useCallback(() => {
    setCurrentTip(null);
  }, []);

  return { currentTip, showRandomTip, dismissTip };
}

/** Toast layer ~45 — above BottomNav (40), below overlays (70). Human whisper, not system alert. */
export function TipToast({ tip, onDismiss }) {
  useEffect(() => {
    if (!tip) return undefined;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [tip, onDismiss]);

  if (!tip) return null;

  return (
    <div
      className="tip-toast fixed left-1/2 -translate-x-1/2 z-[45] animate-toast-up px-4"
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
      role="status"
    >
      <div className="relative max-w-sm rounded-2xl border border-amber/35 bg-smoke/95 backdrop-blur-md px-4 py-3 shadow-2xl">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss whisper"
          className="absolute right-2 top-2 w-7 h-7 rounded-full bg-ash/80 border border-ember/40 text-dim hover:text-bone font-mono text-sm leading-none"
        >
          ×
        </button>
        <div className="flex items-start gap-3 pr-5">
          <div className="shrink-0 mt-0.5" aria-hidden="true">
            <Mascot variant="thinking" size={36} trackCursor={false} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-amber font-mono tracking-[0.18em] uppercase mb-1">
              Whisper
            </p>
            <p className="text-bone/90 text-sm font-body leading-snug">{tip}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-2 font-mono text-[10px] text-amber underline decoration-dotted underline-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

export function SecretMessage({ message, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[70] bg-ash/90 backdrop-blur-md flex items-center justify-center animate-fade-in p-4">
      <div className="bg-smoke border border-amber/30 rounded-2xl p-8 max-w-sm text-center shadow-2xl">
        <div className="text-4xl mb-4">🔮</div>
        <div className="font-display text-2xl text-amber tracking-wide mb-2">Secret unlocked</div>
        <div className="text-bone/80 font-body text-sm mb-6 leading-relaxed">{message}</div>
        <button
          type="button"
          onClick={onDismiss}
          className="px-6 py-2.5 bg-amber text-ash font-mono text-sm rounded-xl active:scale-95 transition-transform"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

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
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[45] animate-toast-down"
      style={{ top: "calc(4.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="bg-blood/20 border border-blood/40 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 backdrop-blur-md">
        <div className="w-2 h-2 bg-blood rounded-full animate-pulse" />
        <span className="text-bone text-sm font-body">{notification}</span>
      </div>
    </div>
  );
}

export function StreakFire({ count }) {
  if (count < 3) return null;

  return (
    <div className="relative inline-flex items-center">
      <span className="text-2xl animate-pulse">🔥</span>
      <span className="ml-1 text-amber font-display text-lg tabular-nums">{count}</span>
      {count >= 7 && <span className="ml-1 text-[10px] font-mono text-amber/80 tracking-wider">ON FIRE</span>}
    </div>
  );
}
