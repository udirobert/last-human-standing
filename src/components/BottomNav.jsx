import { memo } from 'react';
import { motion } from 'framer-motion';
import { CUE_HOVER } from '../lib/cuelume.js';

// Prefetch the lazy chunks on first interaction so the screen is hot
// by the time the user taps. Cheap on dev tools; fire-and-forget.
const prefetchers = {
  feed: () => import('./Feed.jsx'),
  chat: () => import('./Chat.jsx'),
  leaderboard: () => import('./Leaderboard.jsx'),
  history: () => import('./PlayerHistory.jsx'),
};

const prefetched = new Set();
function prefetch(id) {
  if (prefetched.has(id)) return;
  const p = prefetchers[id]?.();
  if (p) {
    prefetched.add(id);
    p.catch(() => {});
  }
}

// Inline SVG icons — no icon library dependency.
function IconHome({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconVote({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconChat({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconTrophy({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a1 1 0 0 0-1 1v3c0 2.76 1.86 5.08 4.42 5.82" />
      <path d="M17 4h3a1 1 0 0 1 1 1v3c0 2.76-1.86 5.08-4.42 5.82" />
      <path d="M7 4h10v8a5 5 0 0 1-10 0V4z" />
    </svg>
  );
}

const ICONS = { home: IconHome, feed: IconVote, chat: IconChat, leaderboard: IconTrophy };

/** Approx chrome height for scroll padding elsewhere */
export const BOTTOM_NAV_OFFSET =
  "calc(4.25rem + env(safe-area-inset-bottom, 0px))";

function BottomNav({
  current,
  onChange,
  badges = {},
}) {
  const tabs = [
    { id: 'home', label: 'Survive' },
    { id: 'feed', label: 'Vote' },
    { id: 'chat', label: 'Chat' },
    { id: 'leaderboard', label: 'Standings' },
  ];

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-ash/95 backdrop-blur-sm border-t border-ember px-2 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex justify-around items-center relative py-2">
        {/* Sliding active pill */}
        {tabs.map((tab) =>
          current === tab.id ? (
            <motion.div
              key="nav-pill"
              layoutId="nav-pill"
              className="absolute inset-y-0 rounded-xl bg-blood/10 border border-blood/20"
              style={{ width: `${100 / tabs.length}%`, left: `${(tabs.indexOf(tab) / tabs.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            />
          ) : null
        )}

        {tabs.map((tab) => {
          const Icon = ICONS[tab.id];
          const isActive = current === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              onMouseEnter={() => prefetch(tab.id)}
              onTouchStart={() => prefetch(tab.id)}
              whileTap={{ scale: 0.88 }}
              {...CUE_HOVER}
              data-cuelume-press="tick"
              className={`relative flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-colors ${
                isActive ? 'text-blood' : 'text-dim'
              }`}
            >
              <Icon active={isActive} />
              {badges[tab.id] && (
                <span className="absolute top-1 right-3 w-2 h-2 bg-blood rounded-full animate-pulse" />
              )}
              <span className={`font-mono text-[10px] tracking-wide ${isActive ? 'text-blood' : 'text-dim'}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(BottomNav);
