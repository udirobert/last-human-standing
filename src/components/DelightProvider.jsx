import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Confetti } from '../hooks/useDelight.jsx';
import { useSound } from '../hooks/useSound.js';
import { useAchievements, AchievementToast } from '../hooks/useAchievements.jsx';
import { 
  useSurvivalTips, 
  TipToast, 
  useEasterEgg, 
  SecretMessage,
  useSuspenseNotification,
  SuspenseNotification,
} from '../hooks/useSurprises.jsx';
import { useMascotName, MascotNameModal } from '../hooks/usePersonalization.jsx';
import { ensureCuelumeBound, CUE_TOGGLE } from '../lib/cuelume.js';

// Combined context for all delight features
const DelightContext = createContext(null);

export function DelightProvider({ children, showTipOnMount = false }) {
  // Confetti
  const [particles, setParticles] = useState([]);
  const [confettiKey, setConfettiKey] = useState(0);

  const celebrate = useCallback((count = 50) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: `${confettiKey}-${i}`,
      x: Math.random() * 100,
      y: -10,
      color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)],
      size: Math.random() * 8 + 4,
      duration: Math.random() * 2 + 2,
    }));
    setParticles(newParticles);
    setConfettiKey(k => k + 1);
    setTimeout(() => setParticles([]), 3000);
  }, [confettiKey]);

  // Sound — Cuelume under the hood (useSound → playCue)
  const { play, toggle, enabled: soundEnabled } = useSound();

  useEffect(() => {
    ensureCuelumeBound();
  }, []);

  // Achievements
  const { 
    achievements, 
    pendingUnlock, 
    dismissNotification, 
    unlock, 
    checkAndUnlock,
    totalXP 
  } = useAchievements();

  // Survival tips
  const { currentTip, showRandomTip, dismissTip } = useSurvivalTips();
  
  // Show initial tip if requested
  useEffect(() => {
    if (showTipOnMount) {
      const timer = setTimeout(showRandomTip, 3000);
      return () => clearTimeout(timer);
    }
  }, [showTipOnMount, showRandomTip]);

  // Easter eggs
  const { count: easterEggCount, increment: easterEggTap, unlocked: easterEggUnlocked } = useEasterEgg('tap_logo_5');
  const [showSecret, setShowSecret] = useState(false);
  const secretTriggeredRef = useRef(false);

  // Use effect to avoid direct setState during render
  useEffect(() => {
    if (easterEggUnlocked && !secretTriggeredRef.current) {
      secretTriggeredRef.current = true;
      setShowSecret(true);
    }
  }, [easterEggUnlocked]);

  // Suspense notifications
  const { notification: suspenseNotification, show: showSuspense, dismiss: dismissSuspense } = useSuspenseNotification();

  // Mascot name
  const { name: mascotName, saveName: saveMascotName } = useMascotName();
  const [showNameModal, setShowNameModal] = useState(false);

  // Track mascot interaction
  const handleMascotClick = useCallback((type) => {
    play('tick');
    if (type === 'secret') {
      unlock('collector'); // Hidden achievement
      setShowSecret(true);
    } else {
      easterEggTap();
    }
  }, [play, easterEggTap, unlock]);

  // Expose methods
  const value = {
    // Confetti
    celebrate,
    
    // Sound (Cuelume-backed)
    playSound: play,
    toggleSound: toggle,
    soundEnabled,
    
    // Achievements
    unlockAchievement: unlock,
    checkAchievement: checkAndUnlock,
    achievements,
    totalXP,
    
    // Tips
    showTip: showRandomTip,
    
    // Easter egg
    handleMascotClick,
    easterEggCount,
    
    // Mascot name
    mascotName,
    setMascotName: (name) => {
      saveMascotName(name);
      setShowNameModal(false);
    },
    showNameModal: () => setShowNameModal(true),
    
    // Suspense
    showSuspense,
    
    // Utility
    playSuccess: () => play('success'),
    playError: () => play('error'),
    playVictory: () => play('victory'),
  };

  return (
    <DelightContext.Provider value={value}>
      {children}
      
      {/* Overlays */}
      <Confetti particles={particles} />
      
      {pendingUnlock && (
        <AchievementToast 
          achievement={pendingUnlock} 
          onClose={dismissNotification} 
        />
      )}
      
      {currentTip && (
        <TipToast tip={currentTip} onDismiss={dismissTip} />
      )}
      
      {showSecret && (
        <SecretMessage 
          message="🤫 The whispers say 'patience wins battles, but persistence wins wars.'"
          onDismiss={() => setShowSecret(false)}
        />
      )}
      
      <SuspenseNotification 
        notification={suspenseNotification}
        onDismiss={dismissSuspense}
      />
      
      {showNameModal && (
        <MascotNameModal 
          onSave={saveMascotName}
          onSkip={() => setShowNameModal(false)}
        />
      )}
    </DelightContext.Provider>
  );
}

// Hook to use delight context
export function useDelight() {
  const context = useContext(DelightContext);
  if (!context) {
    throw new Error('useDelight must be used within a DelightProvider');
  }
  return context;
}

// Sound toggle button component
export function SoundToggle() {
  const { toggleSound, soundEnabled } = useDelight();
  
  return (
    <button
      type="button"
      onClick={toggleSound}
      {...CUE_TOGGLE}
      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
      title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
    >
      <motion.span
        key={soundEnabled ? 'on' : 'off'}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{ display: 'inline-block' }}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </motion.span>
    </button>
  );
}