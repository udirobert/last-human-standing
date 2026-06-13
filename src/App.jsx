import { useState, useCallback, useEffect, Component, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Onboarding from './components/Onboarding';
import GameHome from './components/GameHome';
import CheckIn from './components/CheckIn';
import BottomNav from './components/BottomNav';
import ScreenLoader from './components/ui/ScreenLoader.jsx';
import { DelightProvider, useDelight } from './components/DelightProvider.jsx';
import { useScreenState } from './hooks/useScreenState.js';

const Feed = lazy(() => import('./components/Feed.jsx'));
const Chat = lazy(() => import('./components/Chat.jsx'));
const Leaderboard = lazy(() => import('./components/Leaderboard.jsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'));
const PlayerHistory = lazy(() => import('./components/PlayerHistory.jsx'));

// Error boundary — catches crashes and shows a retry screen instead of white page
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) {
    console.error('ErrorBoundary caught:', err, info);
    const body = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
      componentStack: info?.componentStack ?? null,
      userAgent: navigator.userAgent,
    };
    fetch("/api/report-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }
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
  ADMIN: 'admin',
  HISTORY: 'history',
};

  // Wrapper to use delight hooks in App
  function AppWithDelight() {
    const { playSound, celebrate } = useDelight();
    const [refreshNonce, setRefreshNonce] = useState(0);
    const handleRefresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

    const { screen, navTab, setScreen, setNavTab } = useScreenState({
      defaultScreen: SCREENS.ONBOARDING,
      validScreens: Object.values(SCREENS),
    });
    const [badges, setBadges] = useState({});

    // Check for admin access via URL param or direct navigation
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin') === '1' || window.location.pathname === '/admin';
    const isAdminEnabled = import.meta.env.VITE_ADMIN_TOKEN && import.meta.env.VITE_ADMIN_TOKEN.trim() !== '';
    const isAdmin = adminParam && isAdminEnabled;

    useEffect(() => {
      window.scrollTo({ top: 0, left: 0 });
      document.scrollingElement?.scrollTo?.({ top: 0, left: 0 });
    }, [screen]);

    const clearBadge = useCallback((tab) => {
      setBadges((b) => (b[tab] ? { ...b, [tab]: false } : b));
    }, []);

    const handleEnterGame = () => {
      playSound('victory');
      celebrate(30);
      setScreen(SCREENS.HOME);
      setNavTab('home');
    };

    const handleNavChange = (tab) => {
      playSound('click');
      setNavTab(tab);
      clearBadge(tab);
      if (tab === 'home') setScreen(SCREENS.HOME);
      else if (tab === 'feed') setScreen(SCREENS.FEED);
      else if (tab === 'chat') setScreen(SCREENS.CHAT);
      else if (tab === 'leaderboard') setScreen(SCREENS.LEADERBOARD);
    };

    // Auto-redirect to admin screen if admin access is granted
    useEffect(() => {
      if (isAdmin && screen !== SCREENS.ADMIN) {
        setScreen(SCREENS.ADMIN);
        setNavTab('admin');
      }
    }, [isAdmin, screen, setScreen, setNavTab]);

  // Allow admins to access dashboard via URL param or secret route
  // For security, we'll check if admin token is set and allow direct navigation
  const handleAdminAccess = () => {
    if (isAdmin) {
      setScreen(SCREENS.ADMIN);
      setNavTab('admin');
    }
  };

  const isInGame = screen !== SCREENS.ONBOARDING && screen !== SCREENS.CHECKIN;

  return (
    <div className="relative">


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
              onCheckIn={() => { playSound('click'); setScreen(SCREENS.CHECKIN); }}
              onViewFeed={() => handleNavChange('feed')}
              onViewHistory={() => setScreen(SCREENS.HISTORY)}
              onRefresh={handleRefresh}
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
            <CheckIn onBack={() => setScreen(SCREENS.HOME)} onSubmit={() => { playSound('success'); setScreen(SCREENS.HOME); }} />
          </motion.div>
        )}

        {screen === SCREENS.FEED && (
          <Suspense fallback={<ScreenLoader kind="list" />}>
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Feed onBack={() => handleNavChange('home')} />
          </motion.div>
          </Suspense>
        )}

        {screen === SCREENS.CHAT && (
          <Suspense fallback={<ScreenLoader kind="chat" />}>
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Chat onBack={() => handleNavChange('home')} />
          </motion.div>
          </Suspense>
        )}

      {screen === SCREENS.LEADERBOARD && (
        <Suspense fallback={<ScreenLoader kind="list" />}>
        <motion.div
          key="leaderboard"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Leaderboard onBack={() => handleNavChange('home')} />
        </motion.div>
        </Suspense>
      )}

      {screen === SCREENS.ADMIN && (
        <Suspense fallback={<ScreenLoader kind="detail" />}>
        <motion.div
          key="admin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <AdminDashboard onBack={() => { setScreen(SCREENS.HOME); setNavTab('home'); }} />
        </motion.div>
        </Suspense>
      )}

      {screen === SCREENS.HISTORY && (
        <Suspense fallback={<ScreenLoader kind="detail" />}>
        <motion.div
          key="history"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <PlayerHistory onBack={() => handleNavChange('home')} />
        </motion.div>
        </Suspense>
      )}
      </AnimatePresence>

      {isInGame && (
        <BottomNav
          current={navTab}
          onChange={handleNavChange}
          badges={badges}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DelightProvider showTipOnMount={true}>
        <AppWithDelight />
      </DelightProvider>
    </ErrorBoundary>
  );
}
