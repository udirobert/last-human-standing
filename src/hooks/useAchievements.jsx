import { useState, useEffect, useCallback } from 'react';
import Mascot from '../components/Mascot.jsx';

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

// Achievement unlock notification — brand tokens, toast layer
export function AchievementToast({ achievement, mascotName, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[45] animate-toast-up px-4"
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="bg-smoke/95 backdrop-blur-md border border-amber/40 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-4 max-w-sm">
        <div className="relative w-14 h-14 shrink-0" aria-hidden="true">
          <Mascot variant="proud" size={54} trackCursor={false} />
          <span className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-ash border border-amber/50 flex items-center justify-center text-sm">
            {achievement.icon}
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-amber tracking-[0.16em] uppercase">
            {mascotName || "Survivor"} found something
          </div>
          <div className="font-display text-xl text-bone leading-tight">{achievement.name}</div>
          <div className="font-mono text-[10px] text-dim mt-0.5">+{achievement.xp} XP</div>
        </div>
      </div>
    </div>
  );
}

/** Prototype grid — branded but not mounted in main chrome yet. */
export function AchievementGrid({ unlocked = [] }) {
  const categories = ['checkin', 'streak', 'game', 'social', 'special'];

  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim mb-3">{cat}</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(ACHIEVEMENTS)
              .filter(a => a.category === cat)
              .map(a => {
                const isUnlocked = unlocked.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`relative p-3 rounded-xl text-center transition-[background-color,border-color,opacity] ${
                      isUnlocked
                        ? 'bg-amber/10 border border-amber/30'
                        : 'bg-smoke/60 border border-ember/40 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-1">{a.icon}</div>
                    <div className="text-[11px] font-body text-bone/80">{a.name}</div>
                    {isUnlocked && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-neon rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-ash" fill="currentColor" viewBox="0 0 20 20">
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
    <div className="bg-smoke/70 border border-ember/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-dim">Level {level}</span>
        <span className="font-mono text-[10px] text-dim">{xp} / {nextXp} XP</span>
      </div>
      <div className="h-2 bg-ash rounded-full overflow-hidden border border-ember/30">
        <div
          className="h-full bg-amber transition-[width] duration-500"
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
