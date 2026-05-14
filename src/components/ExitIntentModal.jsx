import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from './Mascot';

/**
 * Exit Intent Modal - shows 70% discount when user tries to leave
 * Tracks mouse leaving viewport or going to close button
 */
export default function ExitIntentModal({ isOpen, onAccept, onDecline, originalPrice = '1 WLD', discountedPrice = '0.35 WLD' }) {
  const [countdown, setCountdown] = useState(10);
  const [accepting, setAccepting] = useState(false);
  
  // Countdown timer
  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      setAccepting(false);
      return;
    }
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleAccept = () => {
    setAccepting(true);
    setTimeout(() => {
      onAccept();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onDecline();
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-sm bg-smoke border-2 border-amber rounded-3xl p-6 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber/10 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blood/10 rounded-full" />
            
            {/* Close button */}
            <button
              onClick={onDecline}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-ember text-dim hover:text-bone flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            
            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Mascot with urgent expression */}
              <div className="mb-4">
                <Mascot variant="thinking" size={80} />
              </div>
              
              {/* Urgency text */}
              <div className="mb-4">
                <p className="text-dim text-xs font-mono uppercase tracking-wider mb-1">Wait!</p>
                <h2 className="font-display text-3xl text-bone mb-2">Don't leave yet!</h2>
                <p className="text-bone/80 text-sm">
                  We noticed you might be on your way out. Here's an exclusive offer just for you:
                </p>
              </div>
              
              {/* Discount offer */}
              <div className="bg-amber/10 border border-amber/30 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-dim text-xs font-mono line-through">{originalPrice}</p>
                    <p className="font-display text-3xl text-dim">1 WLD</p>
                  </div>
                  <div className="text-4xl">→</div>
                  <div className="text-center">
                    <p className="text-neon text-xs font-mono uppercase mb-1">70% OFF</p>
                    <p className="font-display text-4xl text-neon">{discountedPrice}</p>
                  </div>
                </div>
                <div className="h-px bg-amber/20 my-3" />
                <p className="text-bone text-sm">
                  <span className="text-amber font-mono">7-day free trial</span> included. Cancel anytime.
                </p>
              </div>
              
              {/* Countdown urgency */}
              <div className="mb-5 p-3 bg-blood/10 border border-blood/20 rounded-xl">
                <p className="text-blood text-sm font-mono">
                  ⏰ This offer expires in <span className="font-display text-2xl">{countdown}s</span>
                </p>
              </div>
              
              {/* CTA buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAccept}
                  disabled={accepting || countdown === 0}
                  className={`w-full py-4 rounded-2xl font-display text-2xl tracking-wider transition-all active:scale-95 ${
                    accepting
                      ? 'bg-neon/50 text-ash animate-pulse'
                      : countdown === 0
                        ? 'bg-ember text-dim'
                        : 'bg-amber text-ash hover:bg-amber/90'
                  }`}
                >
                  {accepting ? 'SECURING YOUR SPOT...' : 'CLAIM MY DISCOUNT'}
                </button>
                
                <button
                  onClick={onDecline}
                  className="w-full py-3 text-dim text-sm font-mono hover:text-bone transition-colors"
                >
                  No thanks, I'll pay full price
                </button>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-5 flex items-center justify-center gap-4 text-dim text-xs font-mono">
                <span>✓ Secure payment</span>
                <span>✓ Cancel anytime</span>
                <span>✓ No hidden fees</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to track exit intent behavior
 */
export function useExitIntent(options = {}) {
  const {
    delay = 5000,        // Delay before tracking begins
    enabled = true,      // Enable/disable tracking
    onExitIntent = () => {}, // Callback when exit intent detected
  } = options;
  
  const [shown, setShown] = useState(false);
  const triggeredRef = useRef(false);
  
  useEffect(() => {
    if (!enabled || shown) return;
    
    let timeout;
    
    const handleMouseLeave = (e) => {
      // Only trigger when leaving to outside the page (not to other elements)
      if (e.clientY <= 0 && !triggeredRef.current) {
        triggeredRef.current = true;
        setShown(true);
        onExitIntent();
      }
    };
    
    // Also track visibility change (switching tabs, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden && !triggeredRef.current) {
        triggeredRef.current = true;
        setShown(true);
        onExitIntent();
      }
    };
    
    // Delay before starting to track
    timeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, delay);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, delay, shown, onExitIntent]);
  
  const reset = () => {
    setShown(false);
    triggeredRef.current = false;
  };
  
  return { shown, reset };
}