import { useEffect } from 'react';
import { useSoundPreferences } from '../hooks/usePersonalization.jsx';
import { useSound } from '../hooks/useSound.jsx';

/**
 * SoundProvider - Provides sound effects throughout the app
 * 
 * Wraps children and respects user sound preferences
 * Automatically handles cleanup
 */
export default function SoundProvider({ children }) {
  const { soundEnabled, volume } = useSoundPreferences();
  const sounds = useSound({ enabled: soundEnabled, volume });

  // Initialize audio on mount (will be triggered on first interaction)
  useEffect(() => {
    // Pre-warm the audio context on mount
    // Actual playback happens on user interaction
    const initAudio = () => {
      sounds.onClick(); // Silent click to init
    };

    // Delay to avoid blocking render
    const timer = setTimeout(initAudio, 2000);

    return () => clearTimeout(timer);
  }, [sounds]);

  // Provide sounds through context
  // Components can use useSound() directly or access via context
  return children;
}