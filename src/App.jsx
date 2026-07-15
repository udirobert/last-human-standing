import { useState, useCallback, useEffect, useRef, Component, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Onboarding from './components/Onboarding';
import GameHome from './components/GameHome';
import CheckIn from './components/CheckIn';
import BottomNav from './components/BottomNav';
import ScreenLoader from './components/ui/ScreenLoader.jsx';
import AmbientBackdrop from './components/AmbientBackdrop.jsx';
import { DelightProvider, useDelight } from './components/DelightProvider.jsx';
import { MascotEventProvider } from './components/MascotEventProvider.jsx';
import { useScreenState } from './hooks/useScreenState.js';
import { useWorld } from './world/WorldProvider.jsx';
import { useRound } from './world/RoundProvider.jsx';

const Feed = lazy(() => import('./components/Feed.jsx'));
const Chat = lazy(() => import('./components/Chat.jsx'));
const Leaderboard = lazy(() => import('./components/Leaderboard.jsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'));
const PlayerHistory = lazy(() => import('./components/PlayerHistory.jsx'));
const SpeedRunApp = lazy(() => import('./speedrun/SpeedRunApp.jsx'));

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
        <div className="relative min-h-[100svh] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
          <AmbientBackdrop phase="ended" />
          <div className="relative z-10">
            <p className="text-4xl mb-4">💀</p>
            <p className="font-display text-2xl text-bone mb-2">Something broke</p>
            <p className="text-dim font-mono text-xs mb-2">We&apos;ve been notified and are looking at it.</p>
            <p className="text-dim/70 font-mono text-[10px] mb-6 max-w-xs">
              If this keeps happening, reach out on Discord — include the time it happened and what you were doing.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-6 py-3 rounded-xl bg-blood text-bone font-mono text-sm active:scale-95 transition-transform"
            >
              Reload app
            </button>
            <a
              href="https://discord.gg/last-human-standing"
              target="_blank"
              rel="noreferrer"
              className="mt-3 block font-mono text-dim text-xs underline decoration-dotted underline-offset-2"
            >
              Report on Discord →
            </a>
          </div>
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
  SPEEDRUN: 'speedrun',
};

  // Wrapper to use delight hooks in App
  function AppWithDelight() {
    const { playSound, celebrate } = useDelight();
    const { entryPaid } = useWorld();
    const { phase, you } = useRound();
    const [refreshNonce, setRefreshNonce] = useState(0);
    const handleRefresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

    const { screen, navTab, setScreen, setNavTab } = useScreenState({
      defaultScreen: SCREENS.ONBOARDING,
      validScreens: Object.values(SCREENS),
    });
    const [badges, setBadges] = useState({});
    const adminEnteredRef = useRef(false);

    // Reserved players belong in the lobby — not a duplicate onboarding countdown.
    useEffect(() => {
      const reserved = Boolean(entryPaid || you?.isPaid);
      if (!reserved || screen !== SCREENS.ONBOARDING) return;
      if (phase !== 'prelaunch' && phase !== 'live') return;
      playSound('victory');
      celebrate(30);
      setScreen(SCREENS.HOME);
      setNavTab('home');
    }, [entryPaid, you?.isPaid, phase, screen, setScreen, setNavTab, playSound, celebrate]);

    // Returning users who already saw onboarding should land on the prelaunch home,
    // not the reserve wall, until they choose to reserve.
    useEffect(() => {
      if (screen !== SCREENS.ONBOARDING) return;
      const reserved = Boolean(entryPaid || you?.isPaid);
      if (reserved) return;
      try {
        if (localStorage.getItem("lhs_onboarding_v2_done") === "1") {
          setScreen(SCREENS.HOME);
          setNavTab("home");
        }
      } catch { /* ignore */ }
    }, [screen, entryPaid, you?.isPaid, setScreen, setNavTab]);

    // One-shot admin entry via URL — enter once, then clear the param so
    // BottomNav / back can leave without being forced back into ADMIN.
    useEffect(() => {
      if (adminEnteredRef.current) return;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const adminParam = urlParams.get('admin') === '1' || window.location.pathname === '/admin';
        const isAdminEnabled = import.meta.env.VITE_ADMIN_TOKEN && import.meta.env.VITE_ADMIN_TOKEN.trim() !== '';
        if (!adminParam || !isAdminEnabled) return;

        adminEnteredRef.current = true;
        setScreen(SCREENS.ADMIN);
        setNavTab('admin');

        const url = new URL(window.location.href);
        url.searchParams.delete('admin');
        const nextPath = url.pathname === '/admin' ? '/' : url.pathname;
        window.history.replaceState({}, '', nextPath + url.search + url.hash);
      } catch { /* ignore */ }
    }, [setScreen, setNavTab]);

    useEffect(() => {
      window.scrollTo({ top: 0, left: 0 });
      document.scrollingElement?.scrollTo?.({ top: 0, left: 0 });
    }, [screen]);

    // Lightweight page-view ping. One row per navigation, captured
    // on the server so we can tell if anyone saw the page even
    // when they bounce. sendBeacon is used on unload so we don't
    // block navigation.
    useEffect(() => {
      const body = JSON.stringify({
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      });
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/api/track", blob);
        } else {
          fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
        }
      } catch {
        // best-effort
      }
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

  const isInGame = screen !== SCREENS.ONBOARDING && screen !== SCREENS.CHECKIN && screen !== SCREENS.SPEEDRUN;

  return (
    <div className="relative">


      <AnimatePresence mode="wait">
        {screen === SCREENS.ONBOARDING && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <Onboarding
              onEnter={handleEnterGame}
              onSpeedRun={() => { setScreen(SCREENS.SPEEDRUN); }}
            />
          </motion.div>
        )}

        {screen === SCREENS.SPEEDRUN && (
          <Suspense fallback={<ScreenLoader kind="detail" />}>
          <motion.div
            key="speedrun"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <SpeedRunApp
              onReserve={() => {
                try { sessionStorage.setItem("lhs_enter_reserve", "1"); } catch { /* ignore */ }
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("demo");
                  window.history.replaceState({}, "", url.pathname + url.search);
                } catch { /* ignore */ }
                setScreen(SCREENS.ONBOARDING);
                setNavTab('home');
              }}
              onExit={() => {
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("demo");
                  window.history.replaceState({}, "", url.pathname + url.search);
                } catch { /* ignore */ }
                setScreen(SCREENS.ONBOARDING);
                setNavTab('home');
              }}
            />
          </motion.div>
          </Suspense>
        )}

        {screen === SCREENS.HOME && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <GameHome
              onCheckIn={() => { setScreen(SCREENS.CHECKIN); }}
              onViewFeed={() => handleNavChange('feed')}
              onViewHistory={() => { setScreen(SCREENS.HISTORY); setNavTab('home'); }}
              onRouteToOnboarding={() => {
                try { sessionStorage.setItem("lhs_enter_reserve", "1"); } catch { /* ignore */ }
                setScreen(SCREENS.ONBOARDING);
                setNavTab('home');
              }}
              onRefresh={handleRefresh}
            />
          </motion.div>
        )}

        {screen === SCREENS.CHECKIN && (
          <motion.div
            key="checkin"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
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
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <Feed
              onBack={() => handleNavChange('home')}
              onCheckIn={() => { setScreen(SCREENS.CHECKIN); }}
            />
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
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
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
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <Leaderboard
            onBack={() => handleNavChange('home')}
            onCheckIn={() => { setScreen(SCREENS.CHECKIN); }}
            onRouteToOnboarding={() => { setScreen(SCREENS.ONBOARDING); setNavTab('home'); }}
          />
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
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
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
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <PlayerHistory onBack={() => handleNavChange('home')} />
        </motion.div>
        </Suspense>
      )}
      </AnimatePresence>

      {isInGame && (
        <BottomNav
          current={navTab === 'admin' || navTab === 'history' ? 'home' : navTab}
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
        <MascotEventProvider>
          <AppWithDelight />
        </MascotEventProvider>
      </DelightProvider>
    </ErrorBoundary>
  );
}
