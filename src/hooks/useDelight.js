import { useState, useEffect, useCallback } from 'react';

// Confetti celebration effect
export function useConfetti() {
  const [particles, setParticles] = useState([]);

  const celebrate = useCallback((count = 50) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: -10,
      color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)],
      size: Math.random() * 8 + 4,
      duration: Math.random() * 2 + 2,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 3000);
  }, []);

  return { particles, celebrate };
}

// Confetti Component
export function Confetti({ particles }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '50%',
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Shake animation for errors
export function useShake() {
  const [shaking, setShaking] = useState(false);

  const shake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  return { shaking, shake };
}

// Pulse animation for attention
export function usePulse() {
  const [pulsing, setPulsing] = useState(false);

  const pulse = useCallback(() => {
    setPulsing(true);
    setTimeout(() => setPulsing(false), 600);
  }, []);

  return { pulsing, pulse };
}

// Easter egg trigger counter
export function useEasterEgg(triggers, onUnlock) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= triggers) {
      onUnlock?.();
    }
  }, [count, triggers, onUnlock]);

  const tap = useCallback(() => setCount((c) => Math.min(c + 1, triggers)), [triggers]);

  return { tap, count, unlocked: count >= triggers };
}

// Float animation hook
export function useFloat(intensity = 10) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame;
    let start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      setOffset(Math.sin(elapsed / 1000) * intensity);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [intensity]);

  return offset;
}

// Button press feedback
export function ButtonFeedback({ children, onClick, className = '', ...props }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className={`transition-all duration-150 ${pressed ? 'scale-95' : 'hover:scale-105'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Loading shimmer
export function Shimmer({ className = '' }) {
  return <div className={`animate-shimmer bg-gradient-to-r ${className}`} />;
}

// Success checkmark animation
export function SuccessCheck() {
  return (
    <div className="animate-bounce-in">
      <svg className="w-16 h-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

// Progress celebration
export function MilestoneBadge({ milestone, unlocked }) {
  const icons = {
    first_checkin: '📍',
    streak_7: '🔥',
    streak_30: '⚡',
    survivor_100: '💀',
    champion: '👑',
    early_bird: '🐦',
    social_share: '📢',
    verified: '✓',
  };

  return (
    <div className={`relative ${unlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}>
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg">
        {icons[milestone] || '🏆'}
      </div>
      {unlocked && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}