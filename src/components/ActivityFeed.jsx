import { useEffect, useRef, useState } from "react";
import { usePolling } from "../hooks/usePolling.js";
import MotifFrieze from "./ui/MotifFrieze.jsx";

/** Cold system status marks — not emoji decoration. */
const MARKS = {
  checkin: { label: "IN", tone: "text-neon border-neon/40 bg-neon/10" },
  late: { label: "LATE", tone: "text-amber border-amber/40 bg-amber/10" },
  vote: { label: "VOTE", tone: "text-bone border-ember/40 bg-ash/60" },
  elimination: { label: "OUT", tone: "text-blood border-blood/40 bg-blood/10" },
};

function StatusMark({ type }) {
  const mark = MARKS[type] || { label: "·", tone: "text-dim border-ember/30 bg-ash/40" };
  return (
    <span
      className={`mt-0.5 shrink-0 inline-flex items-center justify-center min-w-[2.25rem] h-5 px-1 rounded-md border font-mono text-[9px] tracking-wider ${mark.tone}`}
      aria-hidden="true"
    >
      {mark.label}
    </span>
  );
}

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

  if (!events?.length) {
    return (
      <div className="mx-5 mb-4">
        <div className="bg-smoke border border-ember/40 rounded-2xl px-4 py-4 text-center">
          <p className="font-mono text-amber text-[10px] tracking-[0.16em] uppercase mb-1 flex items-center justify-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber/70" />
            Live activity
          </p>
          <p className="font-body text-bone/60 text-xs leading-snug mb-3">
            The field is quiet. Check-ins and votes will appear here as the day moves.
          </p>
          <MotifFrieze className="w-full opacity-80" />
        </div>
      </div>
    );
  }

  const visible = events.slice(0, visibleCount);

  return (
    <div className="mx-5 mb-4">
      <div className="bg-smoke border border-ember rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ember/30">
          <p className="font-mono text-amber text-xs tracking-widest uppercase flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber animate-pulse" />
            Live activity
          </p>
          <button
            type="button"
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
              <StatusMark type={event.type} />
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
