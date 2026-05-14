import { useState, useEffect, useCallback } from 'react';

// Mascot name storage and personalization
export function useMascotName() {
  const [name, setName] = useState(() => {
    return localStorage.getItem('mascot_name') || 'Survivor';
  });

  const saveName = useCallback((newName) => {
    setName(newName);
    localStorage.setItem('mascot_name', newName);
  }, []);

  return { name, saveName };
}

// Mascot name input modal
export function MascotNameModal({ onSave, onSkip }) {
  const [inputName, setInputName] = useState('');

  const handleSave = () => {
    if (inputName.trim()) {
      onSave(inputName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full animate-bounce-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🤖</div>
          <h2 className="text-xl font-bold text-white mb-2">Name Your Guide</h2>
          <p className="text-gray-400 text-sm">Give your survival companion a name</p>
        </div>
        
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value.slice(0, 20))}
          placeholder="Enter name..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-center text-lg mb-4 focus:outline-none focus:border-amber-500 transition-colors"
          maxLength={20}
          autoFocus
        />
        
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={!inputName.trim()}
            className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
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

// Theme selector component
export function ThemeSelector({ currentThemeId, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(THEMES).map(([id, theme]) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`p-4 rounded-xl border-2 transition-all ${
            currentThemeId === id
              ? 'border-amber-500 bg-gray-800'
              : 'border-gray-700 bg-gray-900 hover:border-gray-600'
          }`}
        >
          <div className="flex gap-1 mb-2">
            {Object.values(theme.colors).map((c, i) => (
              <div key={i} className={`w-4 h-4 rounded-full bg-${c}`} />
            ))}
          </div>
          <div className="text-sm text-gray-300">{theme.name}</div>
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