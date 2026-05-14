import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

/**
 * "Survivor" mascot — a determined little figure that's always one step ahead.
 * Used throughout onboarding to build emotional connection.
 */
export default function Mascot({ variant = 'idle', size = 96, showBadge = false, badgeCount = 0 }) {
  const [blink, setBlink] = useState(false);
  
  // Blink animation
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

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
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.div
        animate={variant === 'idle' ? 'idle' : variant}
        variants={variants}
        className="relative"
        style={{ width: size, height: size }}
      >
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
            
            {/* Eyes */}
            {!blink ? (
              <>
                <circle cx="-6" cy="-18" r="4" fill="#0D0D0D" />
                <circle cx="6" cy="-18" r="4" fill="#0D0D0D" />
                {/* Eye shine */}
                <circle cx="-5" cy="-19" r="1.5" fill="white" />
                <circle cx="7" cy="-19" r="1.5" fill="white" />
              </>
            ) : (
              <path d="M-10 -18 Q-6 -14 -2 -18 M2 -18 Q6 -14 10 -18" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" fill="none" />
            )}
            
            {/* Determined smile */}
            <path 
              d="M-6 -8 Q0 -4 6 -8" 
              stroke="#0D0D0D" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              fill="none"
            />
            
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