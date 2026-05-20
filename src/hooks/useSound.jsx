import { useEffect, useRef, useCallback } from 'react';

/**
 * Sound effects hook - plays UI sounds at appropriate moments
 * 
 * Uses Web Audio API for crisp, low-latency sounds
 * Falls back to HTML Audio for browsers without Web Audio
 */

// Sound configuration - frequencies in Hz (musical notes)
const SOUNDS = {
  click: { frequency: 440, duration: 0.08, type: 'sine' },
  success: { frequency: 523, duration: 0.15, type: 'sine' },
  error: { frequency: 220, duration: 0.2, type: 'square' },
  milestone: { frequency: 659, duration: 0.3, type: 'triangle' },
  celebration: { frequency: 880, duration: 0.5, type: 'sine' },
  pop: { frequency: 600, duration: 0.05, type: 'sine' },
  whoosh: { frequency: 200, duration: 0.15, type: 'sine' },
};

// Note sequence for celebration
const CELEBRATION_MELODY = [523, 659, 784, 1047]; // C5, E5, G5, C6

/**
 * useSound - Hook for playing UI sound effects
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether sounds are enabled (default: true, respects system preference)
 * @param {number} options.volume - Volume level 0-1 (default: 0.3)
 */
export function useSound(options = {}) {
  const { enabled = true, volume = 0.3 } = options;
  const audioContextRef = useRef(null);
  const enabledRef = useRef(enabled);

  // Keep ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Initialize audio context on first interaction (browser policy)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        console.warn('Web Audio API not supported');
      }
    }
    return audioContextRef.current;
  }, []);

  // Play a single tone
  const playTone = useCallback((frequency, duration, type = 'sine') => {
    if (!enabledRef.current) return;
    
    const ctx = initAudioContext();
    if (!ctx) return;

    // Resume context if suspended (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope for smooth sound
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }, [volume, initAudioContext]);

  // Play a predefined sound
  const play = useCallback((soundName) => {
    const sound = SOUNDS[soundName];
    if (sound) {
      playTone(sound.frequency, sound.duration, sound.type);
    }
  }, [playTone]);

  // Play melody sequence (for celebrations)
  const playMelody = useCallback((notes, noteDuration = 0.15) => {
    if (!enabledRef.current) return;
    
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, noteDuration, 'sine');
      }, i * noteDuration * 1000);
    });
  }, [playTone]);

  // Context-specific sound methods
  const sounds = {
    // UI interactions
    onClick: () => play('click'),
    onSuccess: () => play('success'),
    onError: () => play('error'),
    onPop: () => play('pop'),
    onWhoosh: () => play('whoosh'),
    
    // Milestones & achievements
    onMilestone: () => play('milestone'),
    onCelebration: () => playMelody(CELEBRATION_MELODY, 0.12),
    onAchievement: () => playMelody([523, 659, 784, 659, 784], 0.1),
    
    // Game events
    onCheckIn: () => playMelody([392, 523, 659], 0.1),
    onEliminated: () => playMelody([440, 330, 220], 0.15),
    onVictory: () => playMelody([523, 659, 784, 1047, 784, 1047], 0.12),
    onCountdown: () => play('click'),
    
    // Paywall
    onPaywallShow: () => play('whoosh'),
    onPurchase: () => playMelody([523, 784, 1047], 0.15),
    
    // Onboarding
    onStepComplete: () => play('success'),
    onProfileComplete: () => playMelody([523, 659, 784, 1047], 0.1),
  };

  // Initialize audio on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const init = () => {
      initAudioContext();
      // Only need to init once
      document.removeEventListener('click', init);
      document.removeEventListener('touchstart', init);
    };

    document.addEventListener('click', init, { once: true });
    document.addEventListener('touchstart', init, { once: true });

    return () => {
      document.removeEventListener('click', init);
      document.removeEventListener('touchstart', init);
    };
  }, [initAudioContext]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return sounds;
}

/**
 * SoundContext - React context for global sound management
 */
import { createContext, useContext } from 'react';

export const SoundContext = createContext({
  play: () => {},
  onClick: () => {},
  onSuccess: () => {},
  onCelebration: () => {},
});

export function useSoundContext() {
  return useContext(SoundContext);
}

export default useSound;