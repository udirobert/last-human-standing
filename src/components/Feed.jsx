import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_SUBMISSIONS, TODAY_THEME } from '../data/game';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';

const STATUS_COLORS = {
  verified: '#00FF94',
  pending: '#FFB800',
  flagged: '#FF1A1A',
};

const STATUS_LABELS = {
  verified: '✅ Verified',
  pending: '⏳ Pending',
  flagged: '⚠️ Flagged',
};

// Emoji-based photo placeholders
const PHOTO_EMOJIS = ['☕', '🧋', '🍵', '☕', '🥐'];

export default function Feed({ onBack }) {
  const { walletAuthed, entryPaid } = useWorld();
  const { verification } = useRound();
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);
  const [voted, setVoted] = useState({});
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      if (!(walletAuthed && entryPaid)) return;
      try {
        const resp = await fetch("/api/feed", { credentials: "include" });
        if (!resp.ok) return;
        const data = await resp.json();
        if (Array.isArray(data?.submissions)) {
          // Map server submissions into the existing UI shape.
          setSubmissions(
            data.submissions.map((s) => ({
              id: s.id,
              user: s.address?.slice(0, 8) + "…",
              caption: s.caption || s.theme || "",
              time: "now",
              votes: s.votes || { real: 0, fake: 0 },
              status: s.status || "pending",
              mediaUrl: s.mediaUrl || null,
              voteQuorum: s.voteQuorum || s.vote_quorum || null,
            })),
          );
        }
      } catch {
        // keep mock feed
      }
    };
    load();
  }, [walletAuthed, entryPaid]);

  const handleVote = async (id, type) => {
    if (voted[id]) return;
    setVoted(v => ({ ...v, [id]: type }));
    setSubmissions(subs =>
      subs.map(s =>
        s.id === id
          ? { ...s, votes: { ...s.votes, [type]: s.votes[type] + 1 } }
          : s
      )
    );

    // Best effort: also send to backend when authenticated.
    if (walletAuthed && entryPaid) {
      try {
        const resp = await fetch("/api/vote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ submissionId: id, vote: type }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.status || data?.voteQuorum) {
            setSubmissions((subs) =>
              subs.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      status: data.status || s.status,
                      voteQuorum: data.voteQuorum || s.voteQuorum,
                      votes: data.votes || s.votes,
                    }
                  : s,
              ),
            );
          }
        }
      } catch {
        // ignore
      }
    }
  };

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 bg-ash z-10">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
            <span className="text-dim text-lg">←</span>
          </button>
          <div>
            <h2 className="font-display text-3xl text-bone tracking-wide">TODAY'S FEED</h2>
            <p className="font-mono text-dim text-xs">{TODAY_THEME.theme} · 1,038 submissions</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'pending', 'verified', 'flagged'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-blood text-bone'
                  : 'bg-smoke text-dim border border-ember'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="mx-5 mb-4 bg-amber/10 border border-amber/30 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl">🗳️</span>
        <p className="text-amber text-xs font-mono">
          Vote on submissions. Finalizes at {verification.voteQuorum} votes
          {verification.voteQuorum !== verification.voteQuorumNormal ? " (low activity today)" : ""}.
        </p>
      </div>

      {/* Submissions */}
      <div className="px-5 space-y-4">
        <AnimatePresence>
          {filtered.map((sub, i) => {
            const totalVotes = sub.votes.real + sub.votes.fake;
            const realPct = totalVotes > 0 ? (sub.votes.real / totalVotes) * 100 : 0;
            const hasVoted = voted[sub.id];
            const quorum = sub.voteQuorum ?? verification.voteQuorum ?? 25;
            const needsVotes = Math.max(0, quorum - totalVotes);

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-smoke border border-ember rounded-3xl overflow-hidden"
              >
                {/* Photo area */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    height: '200px',
                    background: sub.mediaUrl
                      ? `url(${sub.mediaUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${TODAY_THEME.color}20, #1A1A1A 60%)`,
                  }}
                >
                  {!sub.mediaUrl && (
                    <span className="text-8xl opacity-50">{PHOTO_EMOJIS[i % PHOTO_EMOJIS.length]}</span>
                  )}

                  {/* Status badge */}
                  <div
                    className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-mono"
                    style={{
                      background: `${STATUS_COLORS[sub.status]}20`,
                      border: `1px solid ${STATUS_COLORS[sub.status]}60`,
                      color: STATUS_COLORS[sub.status]
                    }}
                  >
                    {STATUS_LABELS[sub.status]}
                  </div>

                  {/* World ID badge */}
                  <div className="absolute bottom-3 left-3 bg-ash/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5">
                    <span className="text-neon text-xs">🌐</span>
                    <span className="font-mono text-neon text-xs">{sub.user}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-bone text-sm mb-1">"{sub.caption}"</p>
                  <p className="text-dim font-mono text-xs mb-4">{sub.time}</p>

                  {/* Vote bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-neon">✅ {sub.votes.real} real</span>
                      <span className="text-blood">❌ {sub.votes.fake} fake</span>
                    </div>
                    <div className="h-1.5 bg-ember rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${realPct}%`,
                          background: realPct > 70 ? '#00FF94' : realPct > 40 ? '#FFB800' : '#FF1A1A'
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-dim font-mono text-xs">
                        {sub.status === "pending"
                          ? `${needsVotes} more votes to finalize (${totalVotes}/${quorum})`
                          : `Finalized at ${totalVotes} votes`}
                      </span>
                      <span className="text-dim font-mono text-xs">
                        {sub.status === "verified" ? "✅ verified" : sub.status === "flagged" ? "⚠️ flagged" : "⏳ pending"}
                      </span>
                    </div>
                  </div>

                  {/* Vote buttons */}
                  {hasVoted ? (
                    <div className="flex items-center justify-center gap-2 py-2 bg-ember rounded-xl">
                      <span className="text-dim font-mono text-xs">
                        You voted <span className={hasVoted === 'real' ? 'text-neon' : 'text-blood'}>
                          {hasVoted === 'real' ? '✅ REAL' : '❌ FAKE'}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleVote(sub.id, 'real')}
                        className="py-3 rounded-xl bg-neon/10 border border-neon/40 text-neon font-display text-xl tracking-wide active:scale-95 transition-transform"
                      >
                        ✅ REAL
                      </button>
                      <button
                        onClick={() => handleVote(sub.id, 'fake')}
                        className="py-3 rounded-xl bg-blood/10 border border-blood/40 text-blood font-display text-xl tracking-wide active:scale-95 transition-transform"
                      >
                        ❌ FAKE
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
