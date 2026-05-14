import { useState, useCallback } from 'react';

// Referral system
export function useReferral() {
  const [referrals, setReferrals] = useState(() => {
    try {
      const stored = localStorage.getItem('referrals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addReferral = useCallback((code) => {
    const newReferral = {
      code,
      date: new Date().toISOString(),
      status: 'pending',
    };
    setReferrals(prev => {
      const updated = [...prev, newReferral];
      localStorage.setItem('referrals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const generateLink = useCallback((userId) => {
    return `${window.location.origin}?ref=${userId.slice(0, 8)}`;
  }, []);

  return { referrals, addReferral, generateLink, referralCount: referrals.length };
}

// Share achievement to social media
export function useShare() {
  const shareAchievement = useCallback((achievement) => {
    const text = `🏆 I unlocked "${achievement.name}" in Last Human Standing! Can you survive?`;
    const url = window.location.origin;
    
    // Try native share API first
    if (navigator.share) {
      navigator.share({ title: 'Last Human Standing', text, url });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${text}\n${url}`);
      return 'copied';
    }
  }, []);

  const shareScore = useCallback((score, rank) => {
    const text = `💀 I'm ranked #${rank} in Last Human Standing with ${score} points! Can you beat me?`;
    const url = window.location.origin;
    
    if (navigator.share) {
      navigator.share({ title: 'Last Human Standing', text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      return 'copied';
    }
  }, []);

  return { shareAchievement, shareScore };
}

// Leaderboard with friend comparisons
export function useFriendsLeaderboard() {
  const [friends, setFriends] = useState([]);
  const [myRank, setMyRank] = useState(null);

  const addFriend = useCallback((friend) => {
    setFriends(prev => {
      const updated = [...prev.filter(f => f.id !== friend.id), friend];
      return updated;
    });
  }, []);

  const isNearby = useCallback((playerRank) => {
    if (!myRank) return false;
    const diff = Math.abs(playerRank - myRank);
    return diff <= 5;
  }, [myRank]);

  return { friends, addFriend, myRank, setMyRank, isNearby };
}

// Toast notification for social actions
export function SocialToast({ type, message, onDismiss }) {
  const icons = {
    share: '📤',
    referral: '🔗',
    friend: '👥',
    rank: '🏆',
  };

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
        <span className="text-2xl">{icons[type] || '📢'}</span>
        <span className="text-gray-200 text-sm">{message}</span>
      </div>
    </div>
  );
}

// Challenge a friend
export function ChallengeCard({ friend, onChallenge }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg">
          {friend.avatar || '👤'}
        </div>
        <div>
          <div className="text-white font-medium">{friend.name}</div>
          <div className="text-gray-400 text-sm">Rank #{friend.rank}</div>
        </div>
      </div>
      <button
        onClick={() => onChallenge(friend)}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition-colors"
      >
        Challenge
      </button>
    </div>
  );
}

// Share button component
export function ShareButton({ onClick, variant = 'default', children }) {
  const variants = {
    default: 'bg-gray-700 hover:bg-gray-600 text-white',
    primary: 'bg-amber-500 hover:bg-amber-400 text-black',
    minimal: 'bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${variants[variant]}`}
    >
      {children || 'Share'}
    </button>
  );
}

// Referral link input (copy to clipboard)
export function ReferralLinkInput({ link, onCopy }) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={link}
        readOnly
        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm"
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(link);
          onCopy?.();
        }}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
      >
        Copy
      </button>
    </div>
  );
}