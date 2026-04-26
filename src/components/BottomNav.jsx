export default function BottomNav({ current, onChange }) {
  const tabs = [
    { id: 'home', label: 'Survive', icon: '🏠' },
    { id: 'feed', label: 'Vote', icon: '🗳️' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'leaderboard', label: 'Standings', icon: '🏆' },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-ash border-t border-ember px-4 py-3 z-50">
      <div className="flex justify-around">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-90 ${
              current === tab.id ? 'text-blood' : 'text-dim'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={`font-mono text-xs tracking-wide ${current === tab.id ? 'text-blood' : 'text-dim'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
