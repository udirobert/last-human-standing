import { useState, useEffect, useCallback } from 'react';
import OverlayPortal from '../components/OverlayPortal.jsx';
import { useFocusTrap } from './useFocusTrap.js';

// Mascot name storage and personalization
export function useMascotName() {
  const [name, setName] = useState(() => {
    const current = localStorage.getItem('lhs_mascot_name');
    const legacy = localStorage.getItem('mascot_name');
    return current || legacy || '';
  });

  const saveName = useCallback((newName) => {
    const normalized = newName.trim().slice(0, 20);
    setName(normalized);
    localStorage.setItem('lhs_mascot_name', normalized);
    localStorage.removeItem('mascot_name');
  }, []);

  return { name, saveName };
}

// Mascot name input modal
export function MascotNameModal({ onSave, onSkip }) {
  const [inputName, setInputName] = useState('');
  const trapRef = useFocusTrap(true, { onEscape: onSkip });

  const handleSave = () => {
    if (inputName.trim()) {
      onSave(inputName.trim());
    }
  };

  return (
    <OverlayPortal>
      <div
        ref={trapRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Name your guide"
        className="fixed inset-0 z-[70] bg-ash/90 backdrop-blur-md flex items-center justify-center p-4 outline-none"
      >
        <div className="bg-smoke border border-ember/40 rounded-2xl p-8 max-w-sm w-full animate-bounce-in">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🤖</div>
            <h2 className="font-display text-2xl text-bone mb-2 tracking-wide">Name Your Guide</h2>
            <p className="text-dim font-mono text-xs">Give your survival companion a name</p>
          </div>

          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value.slice(0, 20))}
            placeholder="Enter name..."
            className="w-full px-4 py-3 bg-ash border border-ember/40 rounded-xl text-bone text-center text-lg mb-4 focus:outline-none focus:border-amber/60 transition-colors font-body"
            maxLength={20}
            autoFocus
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 px-4 py-3 bg-ash border border-ember/40 hover:border-amber/40 text-dim rounded-xl transition-colors font-mono text-sm"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!inputName.trim()}
              className="flex-1 px-4 py-3 bg-amber text-ash font-mono text-sm rounded-xl transition-colors disabled:opacity-50 active:scale-95"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

// Theme customization
const THEMES = {
  default: {
    name: 'Standard',
    colors: {
      primary: 'amber-500',
      secondary: 'gray-800',
      accent: 'orange-600',
      bg: 'gray-900',
      text: 'gray-100',
    },
  },
  bloodmoon: {
    name: 'Blood Moon',
    colors: {
      primary: 'red-600',
      secondary: 'red-950',
      accent: 'red-500',
      bg: 'gray-950',
      text: 'red-100',
    },
  },
  arctic: {
    name: 'Arctic',
    colors: {
      primary: 'cyan-400',
      secondary: 'gray-800',
      accent: 'blue-500',
      bg: 'gray-900',
      text: 'gray-100',
    },
  },
  gold: {
    name: 'Gold Rush',
    colors: {
      primary: 'yellow-500',
      secondary: 'amber-950',
      accent: 'amber-400',
      bg: 'gray-950',
      text: 'amber-100',
    },
  },
};

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('theme') || 'default';
  });

  const theme = THEMES[themeId] || THEMES.default;

  const setTheme = useCallback((newThemeId) => {
    if (THEMES[newThemeId]) {
      setThemeId(newThemeId);
      localStorage.setItem('theme', newThemeId);
    }
  }, []);

  return { theme, themeId, setTheme, themes: Object.entries(THEMES).map(([id, t]) => ({ id, ...t })) };
}

// Theme selector — branded tokens. Not mounted in main chrome (prototype).
export function ThemeSelector({ currentThemeId, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(THEMES).map(([id, theme]) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`p-4 rounded-xl border transition-[background-color,border-color] ${
            currentThemeId === id
              ? 'border-amber/50 bg-smoke'
              : 'border-ember/40 bg-ash/60 hover:border-ember'
          }`}
        >
          <div className="flex gap-1 mb-2">
            <span className="w-4 h-4 rounded-full bg-amber" />
            <span className="w-4 h-4 rounded-full bg-blood" />
            <span className="w-4 h-4 rounded-full bg-ember" />
            <span className="w-4 h-4 rounded-full bg-bone/40" />
          </div>
          <div className="text-sm font-body text-bone/80">{theme.name}</div>
        </button>
      ))}
    </div>
  );
}

// Dynamic tips based on user profile
export function getPersonalizedTip(profile) {
  const tips = {
    aggressive: [
      "Your boldness is noted. Use it wisely.",
      "Strike first. Strike hard. No mercy.",
      "Aggression wins battles. Strategy wins wars.",
    ],
    strategic: [
      "Patience is your greatest weapon.",
      "The best move is the one they don't see coming.",
      "Think three steps ahead.",
    ],
    social: [
      "Your network is your armor.",
      "Loyal allies are harder to find than enemies.",
      "Trust is earned in small deposits.",
    ],
    survival: [
      "Every round survived is a victory.",
      "You don't need to win. Just outlast.",
      "The last move is the only one that matters.",
    ],
  };

  const category = profile?.playStyle || 'strategic';
  const categoryTips = tips[category] || tips.strategic;
  return categoryTips[Math.floor(Math.random() * categoryTips.length)];
}

// Personalized greeting based on time and profile
export function getPersonalizedGreeting(name, time) {
  const hour = time.getHours();
  let greeting;
  
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else if (hour < 21) greeting = 'Good evening';
  else greeting = 'Still awake, Survivor?';
  
  return `${greeting}, ${name}`;
}

// ============================================================
// SOUND PREFERENCES
// Per competitor analysis: Sound toggle respecting user preferences
// ============================================================

const SOUND_STORAGE_KEY = 'lhs_sound_preferences';

/**
 * Check if system is in "quiet" mode (Do Not Disturb)
 * This uses the prefers-reduced-motion media query as a proxy
 * since browsers don't expose DND state directly
 */
function checkSystemQuietMode() {
  if (typeof window === 'undefined') return false;
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  
  // Check for muted audio (simulated check)
  // In production, you might check actual audio context state
  return prefersReducedMotion;
}

/**
 * Get initial sound state from localStorage or defaults
 */
function getInitialSoundState() {
  if (typeof window === 'undefined') {
    return { soundEnabled: true, musicEnabled: false, volume: 0.25 };
  }

  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }

  // Default: enabled unless system is in quiet mode
  return { 
    soundEnabled: !checkSystemQuietMode(), 
    musicEnabled: false, 
    volume: 0.25 
  };
}

/**
 * Save sound preferences to localStorage
 */
function saveSoundPreferences(prefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * useSoundPreferences - Hook for managing sound preferences
 * 
 * Persists to localStorage, respects system "Do Not Disturb"
 */
export function useSoundPreferences() {
  const [prefs, setPrefs] = useState(() => getInitialSoundState());

  // Update a single preference
  const updatePref = useCallback((key, value) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      saveSoundPreferences(updated);
      return updated;
    });
  }, []);

  // Toggle sound enabled
  const toggleSound = useCallback(() => {
    updatePref('soundEnabled', !prefs.soundEnabled);
  }, [prefs.soundEnabled, updatePref]);

  // Toggle music enabled
  const toggleMusic = useCallback(() => {
    updatePref('musicEnabled', !prefs.musicEnabled);
  }, [prefs.musicEnabled, updatePref]);

  // Set volume (0-1)
  const setVolume = useCallback((vol) => {
    updatePref('volume', Math.max(0, Math.min(1, vol)));
  }, [updatePref]);

  // Reset to defaults
  const reset = useCallback(() => {
    const defaults = { soundEnabled: true, musicEnabled: false, volume: 0.25 };
    setPrefs(defaults);
    saveSoundPreferences(defaults);
  }, []);

  // Sync with system changes (e.g., user enables DND)
  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e) => {
      if (e.matches && prefs.soundEnabled) {
        // System prefers reduced motion - auto-disable sounds
        updatePref('soundEnabled', false);
      }
    };

    if (mediaQuery) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [prefs.soundEnabled, updatePref]);

  return {
    soundEnabled: prefs.soundEnabled,
    musicEnabled: prefs.musicEnabled,
    volume: prefs.volume,
    toggleSound,
    toggleMusic,
    setVolume,
    reset,
    isSystemQuiet: checkSystemQuietMode(),
  };
}

/**
 * SoundSettingsToggle - UI component for sound settings
 */
export function SoundSettingsToggle({ compact = false }) {
  const { soundEnabled, musicEnabled, toggleSound, toggleMusic } = useSoundPreferences();

  if (compact) {
    return (
      <button
        onClick={toggleSound}
        className="p-2 rounded-lg bg-smoke/50 hover:bg-smoke transition-colors"
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
    );
  }

  return (
    <div className="bg-smoke/30 border border-dim/20 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{soundEnabled ? '🔊' : '🔇'}</span>
          <div>
            <p className="text-bone font-medium">Sound Effects</p>
            <p className="text-dim text-sm">UI sounds and feedback</p>
          </div>
        </div>
        <button
          onClick={toggleSound}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            soundEnabled ? 'bg-neon' : 'bg-smoke'
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 rounded-full bg-bone shadow transition-transform ${
              soundEnabled ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{musicEnabled ? '🎵' : '🎧'}</span>
          <div>
            <p className="text-bone font-medium">Background Music</p>
            <p className="text-dim text-sm">Ambient game audio</p>
          </div>
        </div>
        <button
          onClick={toggleMusic}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            musicEnabled ? 'bg-neon' : 'bg-smoke'
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 rounded-full bg-bone shadow transition-transform ${
              musicEnabled ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
