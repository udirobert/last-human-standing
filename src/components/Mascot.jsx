import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

/**
 * "Survivor" mascot — a determined little figure that's always one step ahead.
 * Used throughout onboarding to build emotional connection.
 */
export default function Mascot({ 
  variant = 'idle', 
  size = 96, 
  showBadge = false, 
  badgeCount = 0,
  name = null,
  onClick = null,
  interactive = false,
}) {
  const [blink, setBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // Blink animation
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  // Tap interaction for easter egg
  const handleTap = useCallback(() => {
    if (!interactive) return;
    setTapCount(prev => {
      const next = prev + 1;
      if (next === 5) {
        onClick?.('secret');
      } else {
        onClick?.('tap');
      }
      return next;
    });
  }, [interactive, onClick]);

  const variants = {
    idle: {
      y: [0, -4, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    },
    excited: {
      y: [0, -12, 0, -6, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, repeat: Infinity }
    },
    celebrating: {
      rotate: [-5, 5, -5, 5, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.4, repeat: Infinity }
    },
    thinking: {
      x: [0, -2, 2, -1, 0],
      transition: { duration: 1.5, repeat: Infinity }
    },
    worried: {
      y: [0, 2, 0],
      transition: { duration: 0.8, repeat: Infinity }
    },
    winner: {
      y: [0, -8, 0, -4, 0],
      rotate: [-3, 3, -3, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 1, repeat: Infinity }
    },
    // NEW: Added per competitor analysis
    sad: {
      y: [0, 2, 0],
      scale: [1, 0.95, 1],
      transition: { duration: 2, repeat: Infinity }
    },
    sleeping: {
      rotate: [0, 0, 0],
      opacity: [1, 0.8, 1],
      transition: { duration: 3, repeat: Infinity }
    },
    determined: {
      y: [0, -6, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.8, repeat: Infinity }
    },
    proud: {
      y: [0, -8, 0],
      rotate: [-2, 2, -2, 0],
      transition: { duration: 1.2, repeat: Infinity }
    },
    shocked: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.3, repeat: Infinity }
    },
    cheering: {
      y: [0, -15, 0],
      rotate: [-8, 8, -8, 0],
      transition: { duration: 0.5, repeat: Infinity }
    },
  };

  // Variant-specific expressions
  const getExpression = () => {
    switch (variant) {
      case 'sad':
        return (
          <>
            {/* Sad eyes */}
            <path d="M-10 -20 Q-6 -16 -2 -20" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M2 -20 Q6 -16 10 -20" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Frown */}
            <path d="M-6 -6 Q0 -10 6 -6" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        );
      case 'sleeping':
        return (
          <>
            {/* Closed eyes - ZZZs */}
            <path d="M-10 -18 L-2 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M2 -18 L10 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Peaceful smile */}
            <path d="M-4 -8 Q0 -6 4 -8" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        );
      case 'shocked':
        return (
          <>
            {/* Wide eyes */}
            <circle cx="-6" cy="-18" r="5" fill="#0D0D0D" />
            <circle cx="6" cy="-18" r="5" fill="#0D0D0D" />
            <circle cx="-5" cy="-19" r="2" fill="white" />
            <circle cx="7" cy="-19" r="2" fill="white" />
            {/* O mouth */}
            <circle cx="0" cy="-6" r="4" fill="#0D0D0D" />
          </>
        );
      case 'determined':
        return (
          <>
            {/* Fierce eyes */}
            <path d="M-10 -20 L-2 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M10 -20 L2 -18" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="-6" cy="-18" r="3" fill="#0D0D0D" />
            <circle cx="6" cy="-18" r="3" fill="#0D0D0D" />
            {/* Determined grin */}
            <path d="M-8 -6 Q0 -2 8 -6" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        );
      case 'proud':
        return (
          <>
            {/* Happy closed eyes */}
            <path d="M-10 -18 Q-6 -14 -2 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M2 -18 Q6 -14 10 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Big smile */}
            <path d="M-8 -6 Q0 -2 8 -6" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        );
      default:
        return null; // Use default expression
    }
  };

  const customExpression = getExpression();

  return (
    <div 
      className={`relative inline-flex flex-col items-center ${interactive ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTap}
    >
      <motion.div
        animate={variant === 'idle' ? 'idle' : variant}
        variants={variants}
        className={`relative transition-all ${isHovered && interactive ? 'scale-110' : ''}`}
        style={{ width: size, height: size }}
        whileTap={interactive ? { scale: 0.9 } : {}}
      >
        {/* Glow effect on hover */}
        {isHovered && interactive && (
          <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-xl animate-pulse" />
        )}
        {/* Main body - a determined survivor figure */}
        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Shadow */}
          <ellipse cx="48" cy="88" rx="20" ry="6" fill="rgba(0,0,0,0.3)" />
          
          {/* Body - dynamic running pose */}
          <g transform="translate(48, 48)">
            {/* Legs - mid-stride */}
            <path 
              d="M-8 20 Q-14 32 -12 38" 
              stroke="#FFB800" 
              strokeWidth="6" 
              strokeLinecap="round" 
              fill="none"
              className="legs-left"
            />
            <path 
              d="M8 20 Q14 28 10 36" 
              stroke="#FFB800" 
              strokeWidth="6" 
              strokeLinecap="round" 
              fill="none"
              className="legs-right"
            />
            
            {/* Body */}
            <ellipse cx="0" cy="8" rx="14" ry="18" fill="#FF1A1A" />
            
            {/* Arms - one fist pump, one forward */}
            <path 
              d="M-14 0 Q-28 -8 -24 -16" 
              stroke="#FFB800" 
              strokeWidth="6" 
              strokeLinecap="round" 
              fill="none"
            />
            <path 
              d="M14 0 Q24 -12 20 -22" 
              stroke="#FFB800" 
              strokeWidth="6" 
              strokeLinecap="round" 
              fill="none"
            />
            
            {/* Head */}
            <circle cx="0" cy="-16" r="16" fill="#FFB800" />
            
            {/* Eyes - use custom expression if defined, otherwise default */}
            {!customExpression ? (
              !blink ? (
                <>
                  <circle cx="-6" cy="-18" r="4" fill="#0D0D0D" />
                  <circle cx="6" cy="-18" r="4" fill="#0D0D0D" />
                  {/* Eye shine */}
                  <circle cx="-5" cy="-19" r="1.5" fill="white" />
                  <circle cx="7" cy="-19" r="1.5" fill="white" />
                </>
              ) : (
                <path d="M-10 -18 Q-6 -14 -2 -18 M2 -18 Q6 -14 10 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
              )
            ) : customExpression}
            
            {/* Smile (only if not using custom expression that has its own) */}
            {!['sad', 'sleeping', 'shocked', 'determined', 'proud'].includes(variant) && (
              <path 
                d="M-6 -8 Q0 -4 6 -8" 
                stroke="#0D0D0D" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                fill="none"
              />
            )}
            
            {/* Headband */}
            <path d="M-16 -16 Q0 -22 16 -16" stroke="#FF1A1A" strokeWidth="4" strokeLinecap="round" fill="none" />
            
            {/* Sweat drop - showing effort */}
            <path d="M20 -10 Q22 -6 22 -2 Q22 2 20 2 Q18 2 18 -2 Q18 -6 20 -10" fill="#00C8FF" opacity="0.8" />
          </g>
          
          {/* Speed lines */}
          <g opacity="0.6">
            <line x1="4" y1="40" x2="12" y2="40" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="48" x2="10" y2="48" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="56" x2="14" y2="56" stroke="#00FF94" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
        
        {/* Badge */}
        {showBadge && badgeCount > 0 && (
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-blood rounded-full flex items-center justify-center border-2 border-amber">
            <span className="text-bone text-[10px] font-mono font-bold">{badgeCount > 99 ? '99+' : badgeCount}</span>
          </div>
        )}
      </motion.div>
      
      {/* Floating particles for celebrating variant */}
      {variant === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0 }}
              animate={{ 
                opacity: [1, 1, 0],
                scale: [0, 1],
                y: [0, -30],
                x: [0, (i - 2.5) * 15],
              }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
              className="absolute"
              style={{ top: '50%', left: '50%' }}
            >
              <span className="text-lg">{['✨', '⭐', '💫', '🔥', '⚡', '🌟'][i]}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Name label (if provided) */}
      {name && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-1 bg-gray-800/80 rounded-full border border-gray-700"
        >
          <span className="text-amber-400 text-xs font-medium">{name}</span>
        </motion.div>
      )}

      {/* Speech bubble for interactions */}
      {interactive && isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-xl px-3 py-1.5 shadow-lg"
        >
          <span className="text-gray-300 text-xs whitespace-nowrap">
            {tapCount > 0 ? `${5 - tapCount} more...` : 'Tap me!'}
          </span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-800" />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Small mascot avatar for use in lists and headers
 */
export function MascotAvatar({ size = 32, status = 'alive' }) {
  const statusColors = {
    alive: { bg: 'bg-neon/20', border: 'border-neon', icon: '✓' },
    eliminated: { bg: 'bg-blood/20', border: 'border-blood', icon: '💀' },
    pending: { bg: 'bg-amber/20', border: 'border-amber', icon: '?' },
  };
  const colors = statusColors[status] || statusColors.pending;

  return (
    <div className={`w-${size/4} h-${size/4} rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}>
      <span className="text-sm">{colors.icon}</span>
    </div>
  );
}