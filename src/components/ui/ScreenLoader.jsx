/**
 * Skeleton fallback for <Suspense> boundaries. Three variants:
 *   - list: 4 pulsing rows (Feed, Leaderboard)
 *   - chat: 3 chat-bubble skeletons
 *   - detail: 1 hero block + 3 text rows (PlayerHistory, AdminDashboard, SelfVerify)
 */
export default function ScreenLoader({ kind = "list", className = "" }) {
  if (kind === "chat") return <ChatLoader className={className} />;
  if (kind === "detail") return <DetailLoader className={className} />;
  return <ListLoader className={className} />;
}

function Pulse({ className = "" }) {
  return <div className={`animate-pulse bg-ember/30 rounded ${className}`} />;
}

function ListLoader({ className = "" }) {
  return (
    <div className={`px-5 py-6 space-y-3 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl p-3 bg-smoke border border-ember">
          <Pulse className="w-7 h-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Pulse className="h-3.5 w-2/3 rounded" />
            <Pulse className="h-2.5 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatLoader({ className = "" }) {
  // Asymmetric bubbles so it doesn't look like a regex glitch.
  const widths = ["w-2/3", "w-1/2", "w-3/5"];
  const aligns = ["self-start", "self-end", "self-start"];
  return (
    <div className={`px-5 py-6 flex flex-col gap-2 ${className}`}>
      {widths.map((w, i) => (
        <div key={i} className={`flex flex-col ${aligns[i]} max-w-[80%]`}>
          <Pulse className={`h-3 w-16 rounded mb-1`} />
          <Pulse className={`h-8 ${w} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}

function DetailLoader({ className = "" }) {
  return (
    <div className={`px-5 py-6 space-y-4 ${className}`}>
      <Pulse className="h-40 w-full rounded-2xl" />
      <div className="space-y-2">
        <Pulse className="h-4 w-3/4 rounded" />
        <Pulse className="h-4 w-1/2 rounded" />
      </div>
      <div className="space-y-2 pt-4">
        <Pulse className="h-3 w-full rounded" />
        <Pulse className="h-3 w-5/6 rounded" />
        <Pulse className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}
