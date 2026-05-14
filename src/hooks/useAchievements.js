import { useState, useEffect, useCallback } from 'react';

// Achievement definitions
export const ACHIEVEMENTS = {
  // Check-in achievements
  first_checkin: {
    id: 'first_checkin',
    name: 'First Steps',
    description: 'Complete your first check-in',
    icon: '📍',
    category: 'checkin',
    xp: 50,
  },
  checkin_streak_3: {
    id: 'checkin_streak_3',
    name: 'Getting Warmed Up',
    description: '3-day check-in streak',
    icon: '🔥',
    category: 'streak',
    xp: 100,
  },
  checkin_streak_7: {
    id: 'checkin_streak_7',
    name: 'Committed Survivor',
    description: '7-day check-in streak',
    icon: '⚡',
    category: 'streak',
    xp: 250,
  },
  checkin_streak_30: {
    id: 'checkin_streak_30',
    name: 'Iron Will',
    description: '30-day check-in streak',
    icon: '💎',
    category: 'streak',
    xp: 1000,
  },
  
  // Game achievements
  first_vote: {
    id: 'first_vote',
    name: 'Cast Your Vote',
    description: 'Vote in your first round',
    icon: '🗳️',
    category: 'game',
    xp: 50,
  },
  survivor_10: {
    id: 'survivor_10',
    name: 'Still Standing',
    description: 'Survive 10 rounds',
    icon: '💀',
    category: 'game',
    xp: 500,
  },
  champion: {
    id: 'champion',
    name: 'Last One Standing',
    description: 'Win a game',
    icon: '👑',
    category: 'game',
    xp: 2000,
  },
  
  // Social achievements
  referral_1: {
    id: 'referral_1',
    name: 'Spread the Word',
    description: 'Refer your first friend',
    icon: '📢',
    category: 'social',
    xp: 200,
  },
  share_achievement: {
    id: 'share_achievement',
    name: 'Bragger',
    description: 'Share an achievement publicly',
    icon: '🎉',
    category: 'social',
    xp: 100,
  },
  
  // Special achievements
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Join during beta',
    icon: '🐦',
    category: 'special',
    xp: 300,
  },
  verified_human: {
    id: 'verified_human',
    name: 'Verified Survivor',
    description: 'Complete World ID verification',
    icon: '✓',
    category: 'special',
    xp: 150,
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Unlock 5 achievements',
    icon: '🏆',
    category: 'special',
    xp: 400,
  },
};

// Achievement unlock notification component
export function AchievementToast({ achievement, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-4 max-w-sm">
        <div className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center text-2xl">
          {achievement.icon}
        </div>
        <div>
          <div className="text-black font-bold">Achievement Unlocked!</div>
          <div className="text-black/70 text-sm">{achievement.name}</div>
          <div className="text-black/60 text-xs">+{achievement.xp} XP</div>
        </div>
      </div>
    </div>
  );
}

// Achievement grid component
export function AchievementGrid({ unlocked = [], onShare }) {
  const categories = ['checkin', 'streak', 'game', 'social', 'special'];
  
  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm uppercase text-gray-500 mb-3">{cat}</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(ACHIEVEMENTS)
              .filter(a => a.category === cat)
              .map(a => {
                const isUnlocked = unlocked.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`relative p-3 rounded-xl text-center transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30'
                        : 'bg-gray-800/50 border border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-1">{a.icon}</div>
                    <div className="text-xs font-medium text-gray-300">{a.name}</div>
                    {isUnlocked && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// XP and level system
export const calculateLevel = (xp) => {
  const levels = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
  let level = 0;
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i]) level = i;
  }
  const nextLevel = levels[level + 1] || levels[levels.length - 1];
  const prevLevel = levels[level] || 0;
  const progress = ((xp - prevLevel) / (nextLevel - prevLevel)) * 100;
  
  return { level, xp, progress, nextXp: nextLevel };
};

export function UserLevel({ xp }) {
  const { level, progress, nextXp } = calculateLevel(xp);
  
  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Level {level}</span>
        <span className="text-xs text-gray-500">{xp} / {nextXp} XP</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Hook to manage achievements
export function useAchievements() {
  const [achievements, setAchievements] = useState(() => {
    try {
      const stored = localStorage.getItem('achievements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [pendingUnlock, setPendingUnlock] = useState(null);

  const unlock = useCallback((achievementId) => {
    if (achievements.includes(achievementId)) return;
    
    const newAchievements = [...achievements, achievementId];
    setAchievements(newAchievements);
    localStorage.setItem('achievements', JSON.stringify(newAchievements));
    
    const achievement = ACHIEVEMENTS[achievementId];
    if (achievement) {
      setPendingUnlock(achievement);
    }
  }, [achievements]);

  const dismissNotification = useCallback(() => {
    setPendingUnlock(null);
  }, []);

  const checkAndUnlock = useCallback((condition, achievementId) => {
    if (condition && !achievements.includes(achievementId)) {
      unlock(achievementId);
    }
  }, [achievements, unlock]);

  const totalXP = achievements.reduce((sum, id) => {
    const a = ACHIEVEMENTS[id];
    return sum + (a?.xp || 0);
  }, 0);

  return {
    achievements,
    pendingUnlock,
    dismissNotification,
    unlock,
    checkAndUnlock,
    totalXP,
  };
}