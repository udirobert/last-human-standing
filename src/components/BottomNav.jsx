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

export default function BottomNav({
  current,
  onChange,
  badges = {},
  soundEnabled = true,
  onToggleSound,
}) {
  const tabs = [
    { id: 'home', label: 'Survive', icon: '🏠' },
    { id: 'feed', label: 'Vote', icon: '🗳️' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'leaderboard', label: 'Standings', icon: '🏆' },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-ash border-t border-ember px-4 py-3 z-50">
      <div className="flex justify-around items-center">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => prefetch(tab.id)}
            onTouchStart={() => prefetch(tab.id)}
            className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-90 ${
              current === tab.id ? 'text-blood' : 'text-dim'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {badges[tab.id] && (
              <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-blood rounded-full animate-pulse" />
            )}
            <span className={`font-mono text-xs tracking-wide ${current === tab.id ? 'text-blood' : 'text-dim'}`}>
              {tab.label}
            </span>
          </button>
        ))}
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-dim active:scale-90 transition-transform"
            title={soundEnabled ? 'Sound on (tap to mute)' : 'Sound off (tap to enable)'}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            <span className="text-xl" aria-hidden>{soundEnabled ? '🔊' : '🔇'}</span>
            <span className="font-mono text-xs tracking-wide">
              {soundEnabled ? 'Sound' : 'Muted'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
