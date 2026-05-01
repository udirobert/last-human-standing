import { useState, useCallback, useEffect, Component } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Onboarding from './components/Onboarding';
import GameHome from './components/GameHome';
import CheckIn from './components/CheckIn';
import Feed from './components/Feed';
import Chat from './components/Chat';
import Leaderboard from './components/Leaderboard';
import BottomNav from './components/BottomNav';
import ModeBanner from './components/ModeBanner.jsx';
import RoundMetaBanner from './components/RoundMetaBanner.jsx';

// Error boundary — catches crashes and shows a retry screen instead of white page
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('ErrorBoundary caught:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ash flex flex-col items-center justify-center p-8 text-center">
          <p className="text-4xl mb-4">💀</p>
          <p className="font-display text-2xl text-bone mb-2">Something broke</p>
          <p className="text-dim font-mono text-xs mb-6">An unexpected error occurred.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-6 py-3 rounded-xl bg-blood text-bone font-mono text-sm active:scale-95 transition-transform"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SCREENS = {
  ONBOARDING: 'onboarding',
  HOME: 'home',
  CHECKIN: 'checkin',
  FEED: 'feed',
  CHAT: 'chat',
  LEADERBOARD: 'leaderboard',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.ONBOARDING);
  const [navTab, setNavTab] = useState('home');
  const [badges, setBadges] = useState({});

  const markBadge = useCallback((tab) => {
    setBadges((b) => (b[tab] ? b : { ...b, [tab]: true }));
  }, []);
  const clearBadge = useCallback((tab) => {
    setBadges((b) => (b[tab] ? { ...b, [tab]: false } : b));
  }, []);

  const handleEnterGame = () => {
    setScreen(SCREENS.HOME);
    setNavTab('home');
  };

  const handleNavChange = (tab) => {
    setNavTab(tab);
    clearBadge(tab);
    if (tab === 'home') setScreen(SCREENS.HOME);
    else if (tab === 'feed') setScreen(SCREENS.FEED);
    else if (tab === 'chat') setScreen(SCREENS.CHAT);
    else if (tab === 'leaderboard') setScreen(SCREENS.LEADERBOARD);
  };

  const isInGame = screen !== SCREENS.ONBOARDING && screen !== SCREENS.CHECKIN;

  // Simulate unread chat badge when user is away from chat (browser demo feel)
  useEffect(() => {
    if (!isInGame || screen === SCREENS.CHAT) return;
    const id = setInterval(() => {
      if (screen !== SCREENS.CHAT) markBadge('chat');
    }, 12_000);
    return () => clearInterval(id);
  }, [isInGame, markBadge, screen]);

  return (
    <ErrorBoundary>
    <div className="relative">
      <ModeBanner />
      <RoundMetaBanner />
      <AnimatePresence mode="wait">
        {screen === SCREENS.ONBOARDING && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <Onboarding onEnter={handleEnterGame} />
          </motion.div>
        )}

        {screen === SCREENS.HOME && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <GameHome
              onCheckIn={() => setScreen(SCREENS.CHECKIN)}
              onViewFeed={() => handleNavChange('feed')}
              onViewChat={() => handleNavChange('chat')}
              onViewLeaderboard={() => handleNavChange('leaderboard')}
            />
          </motion.div>
        )}

        {screen === SCREENS.CHECKIN && (
          <motion.div
            key="checkin"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <CheckIn onBack={() => setScreen(SCREENS.HOME)} onSubmit={() => setScreen(SCREENS.HOME)} />
          </motion.div>
        )}

        {screen === SCREENS.FEED && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Feed onBack={() => handleNavChange('home')} />
          </motion.div>
        )}

        {screen === SCREENS.CHAT && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Chat onBack={() => handleNavChange('home')} />
          </motion.div>
        )}

        {screen === SCREENS.LEADERBOARD && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Leaderboard onBack={() => handleNavChange('home')} />
          </motion.div>
        )}
      </AnimatePresence>

      {isInGame && (
        <BottomNav current={navTab} onChange={handleNavChange} badges={badges} />
      )}
    </div>
    </ErrorBoundary>
  );
}
