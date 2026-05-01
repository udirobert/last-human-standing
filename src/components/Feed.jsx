import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_SUBMISSIONS, TODAY_THEME } from '../data/game';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { MiniKit } from "@worldcoin/minikit-js";

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

const PHOTO_EMOJIS = ['☕', '🧋', '🍵', '☕', '🥐'];

export default function Feed({ onBack }) {
  const { walletAuthed, entryPaid, worldIdVerified, sendWorldChat, isMiniApp } = useWorld();
  const { verification } = useRound();
  const [submissions, setSubmissions] = useState(isMiniApp ? [] : MOCK_SUBMISSIONS);
  const [voted, setVoted] = useState({});
  const [fired, setFired] = useState({});
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(isMiniApp);
  const [challengeToast, setChallengeToast] = useState(null);

  const requireWorldIdToVote = import.meta.env.VITE_REQUIRE_WORLD_ID_FOR_VOTING === "true";

  const loadFeed = useCallback(async () => {
    if (!(walletAuthed && entryPaid)) {
      setLoading(false);
      return;
    }
    try {
      const resp = await fetch("/api/feed", { credentials: "include" });
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data?.submissions)) {
        if (!isMiniApp && data.submissions.length === 0) return;
        setSubmissions(
          data.submissions.map((s) => ({
            id: s.id,
            user: s.username ? `@${s.username}` : (s.address?.slice(0, 8) + "…"),
            avatar: s.avatar || null,
            username: s.username ?? null,
            caption: s.caption || s.theme || "",
            time: "now",
            votes: s.votes || { real: 0, fake: 0 },
            status: s.status || "pending",
            mediaUrl: s.mediaUrl || null,
            fires: s.fires || 0,
            infiltrator: s.is_infiltrator || false,
            accuracy: s.accuracy ?? null,
            voteQuorum: s.voteQuorum || s.vote_quorum || null,
          })),
        );
      }
    } catch (error) {
      void error;
    } finally {
      setLoading(false);
    }
  }, [walletAuthed, entryPaid, isMiniApp]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFeed();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleVote = async (id, type) => {
    if (requireWorldIdToVote && !worldIdVerified) return;
    if (voted[id]) return;
    setVoted((v) => ({ ...v, [id]: type }));
    setSubmissions((subs) =>
      subs.map((s) =>
        s.id === id
          ? { ...s, votes: { ...s.votes, [type]: s.votes[type] + 1 } }
          : s,
      ),
    );

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
      } catch (error) {
        void error;
      }
    }
  };

  const handleChallenge = async (sub) => {
    if (!sub?.username) return;
    if (!MiniKit.isInstalled()) {
      setChallengeToast(sub.id);
      setTimeout(() => setChallengeToast(null), 2500);
      return;
    }
    const msg = `I’m challenging your check-in: "${sub.caption}". Reply with context / proof.`;
    await sendWorldChat({ to: sub.username, message: msg });
  };

  const filtered = filter === 'all' ? submissions : submissions.filter((s) => s.status === filter);

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      <div className="px-5 pt-12 pb-4 sticky top-0 bg-ash z-10">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
            <span className="text-dim text-lg">←</span>
          </button>
          <div>
            <h2 className="font-display text-3xl text-bone tracking-wide">AUDIT FEED</h2>
            <p className="font-mono text-dim text-xs">Vote HUMAN or SUS</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {['all', 'pending', 'verified', 'flagged'].map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono border ${filter === key ? 'border-bone text-bone' : 'border-ember text-dim'}`}
            >
              {key.toUpperCase()}
            </button>
          ))}
          <button onClick={handleRefresh} className="ml-auto px-3 py-1.5 rounded-full text-xs font-mono border border-ember text-dim">
            {refreshing ? '...' : 'REFRESH'}
          </button>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {loading && submissions.length === 0 && (
          <div className="text-dim font-mono text-sm text-center py-12">Loading feed…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-dim font-mono text-sm text-center py-12">No submissions yet for {TODAY_THEME.theme}.</div>
        )}

        <AnimatePresence>
          {filtered.map((sub, idx) => {
            const totalVotes = (sub.votes?.real || 0) + (sub.votes?.fake || 0);
            const quorum = sub.voteQuorum || verification.voteQuorum;
            const progress = Math.min(100, Math.round((totalVotes / quorum) * 100));
            const emoji = PHOTO_EMOJIS[idx % PHOTO_EMOJIS.length];
            const isExpanded = expandedId === sub.id;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-smoke border border-ember rounded-3xl overflow-hidden"
              >
                <button onClick={() => setExpandedId(isExpanded ? null : sub.id)} className="w-full text-left">
                  {sub.mediaUrl ? (
                    <img src={sub.mediaUrl} alt={sub.caption} className="w-full h-64 object-cover" />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center text-7xl bg-ash">{emoji}</div>
                  )}
                </button>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-bone font-mono text-sm">{sub.user}</p>
                      <p className="text-dim text-xs font-mono">{sub.time}</p>
                    </div>
                    <span className="text-xs font-mono px-2 py-1 rounded-full" style={{ color: STATUS_COLORS[sub.status], border: `1px solid ${STATUS_COLORS[sub.status]}55` }}>
                      {STATUS_LABELS[sub.status]}
                    </span>
                  </div>

                  <p className="text-bone text-sm leading-relaxed">{sub.caption}</p>
                  {sub.infiltrator && <p className="text-purple-300 font-mono text-xs mt-2">🎭 Infiltrator mode</p>}

                  <div className="mt-3 h-1.5 bg-ash rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-dim text-[10px] font-mono mt-1">{totalVotes}/{quorum} votes</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleVote(sub.id, 'real')}
                      disabled={Boolean(voted[sub.id])}
                      className="py-3 rounded-2xl bg-neon/10 border border-neon/30 text-neon font-mono text-sm disabled:opacity-50"
                    >
                      HUMAN · {sub.votes.real}
                    </button>
                    <button
                      onClick={() => handleVote(sub.id, 'fake')}
                      disabled={Boolean(voted[sub.id])}
                      className="py-3 rounded-2xl bg-blood/10 border border-blood/30 text-blood font-mono text-sm disabled:opacity-50"
                    >
                      SUS · {sub.votes.fake}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      <button
                        onClick={() => handleChallenge(sub)}
                        className="w-full py-3 rounded-2xl bg-amber/10 border border-amber/30 text-amber font-mono text-sm"
                      >
                        Challenge in chat
                      </button>
                      <button
                        onClick={() => setFired((v) => ({ ...v, [sub.id]: !v[sub.id] }))}
                        className="w-full py-3 rounded-2xl bg-ash border border-ember text-dim font-mono text-sm"
                      >
                        {fired[sub.id] ? '🔥 Fired up' : '🔥 Fire reaction'}
                      </button>
                      {challengeToast === sub.id && (
                        <p className="text-amber font-mono text-xs text-center">Open inside World App to challenge via chat.</p>
                      )}
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
