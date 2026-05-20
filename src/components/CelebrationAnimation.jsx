import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * CelebrationAnimation - Shows confetti/particle effects for milestones
 * 
 * Per competitor analysis: "Make your onboarding as fun, clear and engaging as possible"
 * and "Make your onboarding feel memorable, not just functional."
 */
export default function CelebrationAnimation({ 
  type = 'confetti', // 'confetti' | 'fireworks' | 'stars' | 'explosion'
  duration = 2000,
  intensity = 'medium', // 'low' | 'medium' | 'high'
  colors = ['#FFB800', '#FF1A1A', '#00FF94', '#00C8FF', '#FF6B35'],
  onComplete = null,
}) {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const particleCount = intensity === 'low' ? 20 : intensity === 'high' ? 60 : 40;
  
  const particleVariants = {
    confetti: {
      initial: { y: -20, opacity: 1, rotate: 0 },
      animate: { y: ['-20vh', '100vh'], opacity: [1, 1, 0], rotate: [0, 360] }
    },
    fireworks: {
      initial: { scale: 0, opacity: 1 },
      animate: { scale: [0, 1.5], opacity: [1, 1, 0] }
    },
    stars: {
      initial: { scale: 0, opacity: 1, rotate: 0 },
      animate: { scale: [0, 1.2, 0], opacity: [1, 1, 0], rotate: [0, 180, 360] }
    },
    explosion: {
      initial: { scale: 0, opacity: 1 },
      animate: { scale: [0, 2], opacity: [1, 1, 0] }
    }
  };

  const variant = particleVariants[type] || particleVariants.confetti;

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(particleCount)].map((_, i) => {
            const startX = Math.random() * 100;
            const delay = Math.random() * 0.5;
            const color = colors[i % colors.length];
            const size = type === 'stars' ? 24 : type === 'fireworks' ? 16 : 12;
            const emoji = type === 'stars' ? ['⭐', '✨', '💫'][i % 3] : null;

            return (
              <motion.div
                key={i}
                initial={variant.initial}
                animate={type === 'confetti' ? {
                  ...variant.animate,
                  x: [startX + 'vw', (startX + (Math.random() - 0.5) * 20) + 'vw']
                } : {
                  ...variant.animate,
                  x: '50vw',
                  y: '50vh'
                }}
                transition={{
                  duration: (duration / 1000) * (0.5 + Math.random() * 0.5),
                  delay: delay,
                  ease: 'easeOut'
                }}
                className="absolute"
                style={{
                  left: type === 'confetti' ? `${startX}%` : '50%',
                  top: type === 'confetti' ? '-5vh' : '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {emoji ? (
                  <span style={{ fontSize: size }}>{emoji}</span>
                ) : (
                  <div
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      borderRadius: type === 'confetti' ? '50%' : '2px',
                      transform: `rotate(${Math.random() * 360}deg)`
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * MilestoneToast - Shows achievement notifications with celebration
 */
export function MilestoneToast({ 
  title, 
  subtitle, 
  icon = '🎉', 
  show = false,
  onDismiss = null,
  variant = 'default' // 'default' | 'gold' | 'neon' | 'blood'
}) {
  const bgColors = {
    default: 'from-amber/20 to-amber/5 border-amber/30',
    gold: 'from-yellow-500/30 to-yellow-500/5 border-yellow-400/50',
    neon: 'from-neon/20 to-neon/5 border-neon/30',
    blood: 'from-blood/20 to-blood/5 border-blood/30'
  };
  const iconColors = {
    default: 'text-amber',
    gold: 'text-yellow-400',
    neon: 'text-neon',
    blood: 'text-blood'
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 15 }}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r ${bgColors[variant]} border rounded-2xl px-6 py-4 shadow-2xl z-50 max-w-xs`}
          onClick={onDismiss}
        >
          <div className="flex items-center gap-3">
            <span className={`text-4xl ${iconColors[variant]}`}>{icon}</span>
            <div>
              <p className="font-display text-bone text-lg leading-tight">{title}</p>
              {subtitle && <p className="text-dim text-sm">{subtitle}</p>}
            </div>
          </div>
          
          {/* Progress bar that shrinks over time */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 4, ease: 'linear' }}
            className="h-1 bg-amber/30 rounded-full mt-3"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * ProgressMilestone - Shows animated progress towards milestones
 */
export function ProgressMilestone({ 
  current, 
  target, 
  label,
  icon = '🔥',
  showBadge = true 
}) {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className={`relative ${isComplete ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={isComplete ? 'animate-bounce' : ''}>{icon}</span>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-dim">{label}</span>
            <span className="text-amber font-mono">{current}/{target}</span>
          </div>
          <div className="h-2 bg-smoke rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${isComplete ? 'bg-amber' : 'bg-neon'}`}
            />
          </div>
        </div>
        {showBadge && isComplete && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-2xl"
          >
            ✨
          </motion.span>
        )}
      </div>
    </div>
  );
}

/**
 * AchievementBadge - Shows an earned achievement
 */
export function AchievementBadge({ 
  name, 
  description, 
  earned = false,
  earnedAt = null 
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative p-4 rounded-xl border ${
        earned 
          ? 'bg-amber/10 border-amber/30' 
          : 'bg-smoke/50 border-dim/30 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          earned ? 'bg-amber/20' : 'bg-smoke'
        }`}>
          <span className="text-2xl">{earned ? '🏆' : '🔒'}</span>
        </div>
        <div className="flex-1">
          <p className={`font-display ${earned ? 'text-amber' : 'text-dim'}`}>
            {name}
          </p>
          <p className="text-dim text-xs mt-0.5">{description}</p>
          {earned && earnedAt && (
            <p className="text-ember text-xs mt-1">Earned {earnedAt}</p>
          )}
        </div>
      </div>
      
      {earned && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-amber rounded-full flex items-center justify-center"
        >
          <span className="text-xs">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
}