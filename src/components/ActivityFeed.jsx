import { useEffect, useRef, useState } from "react";
import { usePolling } from "../hooks/usePolling.js";

const ICONS = {
  checkin: "✅",
  late: "⏰",
  vote: "🗳️",
  elimination: "💀",
};

export default function ActivityFeed({ maxVisible = 12 }) {
  const { data: events } = usePolling("/api/activity", {
    intervalMs: 15_000,
    transform: (json) => json.events ?? [],
    initial: [],
  });

  const [visibleCount, setVisibleCount] = useState(maxVisible);
  const feedRef = useRef(null);

  useEffect(() => {
    if (!feedRef.current || !events?.length) return;
    const el = feedRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isAtBottom) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [events]);

  if (!events?.length) return null;

  const visible = events.slice(0, visibleCount);

  return (
    <div className="mx-5 mb-4">
      <div className="bg-smoke border border-ember rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ember/30">
          <p className="font-mono text-amber text-xs tracking-widest uppercase flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber animate-pulse" />
            Live Activity
          </p>
          <button
            onClick={() => setVisibleCount(visibleCount >= (events?.length || 0) ? maxVisible : events?.length || maxVisible)}
            className="font-mono text-[10px] text-dim underline"
          >
            {visibleCount >= (events?.length || 0) ? "Collapse" : `See all ${events.length}`}
          </button>
        </div>
        <div
          ref={feedRef}
          className="overflow-y-auto max-h-64 scroll-smooth"
        >
          {visible.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 px-4 py-2.5 border-b border-ember/10 last:border-0 hover:bg-ash/30 transition-colors"
            >
              <span className="text-base mt-0.5 shrink-0">{ICONS[event.type] || "•"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-bone text-sm font-mono truncate">
                  {event.username || `${event.address?.slice(0, 6)}…${event.address?.slice(-4)}`}
                </p>
                <p className="text-dim text-xs font-mono truncate">{event.text}</p>
              </div>
              <span className="text-dim/50 text-[10px] font-mono shrink-0 whitespace-nowrap tabular-nums">
                {formatTimeAgo(event.ts)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
