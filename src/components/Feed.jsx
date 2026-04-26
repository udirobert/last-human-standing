import { useEffect, useState } from 'react';
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

// Fallback photo emojis (only used when no mediaUrl)
const PHOTO_EMOJIS = ['☕', '🧋', '🍵', '☕', '🥐'];

export default function Feed({ onBack }) {
  const { walletAuthed, entryPaid, worldIdVerified, sendWorldChat, isWorldApp } = useWorld();
  const { verification } = useRound();
  const [submissions, setSubmissions] = useState(isWorldApp ? [] : MOCK_SUBMISSIONS);
  const [voted, setVoted] = useState({});
  const [fired, setFired] = useState({});
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const requireWorldIdToVote = import.meta.env.VITE_REQUIRE_WORLD_ID_FOR_VOTING === "true";

  const loadFeed = async () => {
    if (!(walletAuthed && entryPaid)) return;
    try {
      const resp = await fetch("/api/feed", { credentials: "include" });
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data?.submissions)) {
        if (!isWorldApp && data.submissions.length === 0) return; // Keep mock data in demo
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
    } catch {
      // keep mock feed in browser demo; mini app stays empty
    }
  };

  useEffect(() => { loadFeed(); }, [walletAuthed, entryPaid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleVote = async (id, type) => {
    if (requireWorldIdToVote && !worldIdVerified) return;
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

  const [challengeToast, setChallengeToast] = useState(null);

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

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 bg-ash z-10">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke flex items-center justify-center">
            <span className="text-dim text-lg">←</span>
          </button>
          <div className="flex-1">
            <h2 className="font-display text-3xl text-bone tracking-wide">TODAY'S FEED</h2>
            <p className="font-mono text-dim text-xs">{TODAY_THEME.theme} · {submissions.length} submissions</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`w-10 h-10 rounded-xl bg-smoke flex items-center justify-center transition-transform ${
              refreshing ? 'animate-spin' : 'active:scale-90'
            }`}
          >
            <span className="text-dim text-lg">↻</span>
          </button>
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
          Vote blind — tallies reveal after you vote. Finalizes at {verification.voteQuorum} votes
          {verification.voteQuorum !== verification.voteQuorumNormal ? " (low activity today)" : ""}. Hit 🔥 for style.
          {' '}Watch for 🎭 Infiltrators — catch them for Detective points!
        </p>
      </div>

      {requireWorldIdToVote && !worldIdVerified && (
        <div className="mx-5 mb-4 bg-smoke border border-ember rounded-2xl px-4 py-3">
          <p className="text-dim text-xs font-mono text-center">
            Verify World ID to vote (prevents bot brigading).
          </p>
        </div>
      )}

      {/* Submissions */}
      <div className="px-5 space-y-4">
        {filtered.length === 0 && isWorldApp && (
          <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-bone font-display text-lg mb-2">Audit feed opens on Day 1</p>
            <p className="text-dim font-mono text-xs leading-relaxed">
              Each day, survivors check in from a real-world location and submit photo proof.
              The community votes on every submission — verified or flagged.
              Flagged players risk elimination.
            </p>
          </div>
        )}
        <AnimatePresence>
          {filtered.map((sub, i) => {
            const totalVotes = sub.votes.real + sub.votes.fake;
            const realPct = totalVotes > 0 ? (sub.votes.real / totalVotes) * 100 : 0;
            const hasVoted = voted[sub.id];
            const hasFired = fired[sub.id];
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

                  {/* Avatar */}
                  {sub.avatar && (
                    <img
                      src={sub.avatar}
                      alt=""
                      className="absolute top-3 left-3 w-8 h-8 rounded-full border border-ember bg-smoke"
                    />
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
                    <span className="font-mono text-neon text-xs">{sub.username ? `@${sub.username}` : sub.user}</span>
                    {sub.accuracy != null && (
                      <span className={`font-mono text-[10px] ml-1 ${sub.accuracy >= 80 ? 'text-neon' : sub.accuracy >= 60 ? 'text-amber' : 'text-blood'}`}>
                        🎯{sub.accuracy}%
                      </span>
                    )}
                  </div>

                  {/* Infiltrator reveal — only shown after finalization */}
                  {sub.infiltrator && sub.status !== 'pending' && (
                    <div className="absolute bottom-3 right-3 bg-purple-500/20 backdrop-blur-sm border border-purple-400/40 rounded-full px-2 py-1">
                      <span className="font-mono text-purple-300 text-xs">🎭 Infiltrator</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-bone text-sm mb-1">"{sub.caption}"</p>
                  <p className="text-dim font-mono text-xs mb-4">{sub.time}</p>

                  {/* Vote bar — hidden until you vote (blind voting) */}
                  <div className="mb-3">
                    {hasVoted || sub.status !== "pending" ? (
                      <>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-neon">✅ {sub.votes.real} human</span>
                          <span className="text-blood">🤖 {sub.votes.fake} sus</span>
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

                        {/* Infiltrator outcome — shown after finalization */}
                        {sub.infiltrator && sub.status !== 'pending' && (
                          <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-mono ${
                            sub.status === 'verified'
                              ? 'bg-purple-500/10 border border-purple-400/30 text-purple-300'
                              : 'bg-neon/10 border border-neon/30 text-neon'
                          }`}>
                            {sub.status === 'verified'
                              ? '🎭 Infiltrator got away with it! Earned immunity.'
                              : '🎭 Infiltrator CAUGHT! Double elimination risk.'}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-2">
                        <span className="text-dim font-mono text-xs">👁️ Vote to reveal the tally</span>
                        <span className="text-dim font-mono text-xs ml-auto">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} so far</span>
                      </div>
                    )}
                  </div>

                  {/* Vote buttons */}
                  {hasVoted ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-ember rounded-xl">
                        <span className="text-dim font-mono text-xs">
                          You voted <span className={hasVoted === 'real' ? 'text-neon' : 'text-blood'}>
                            {hasVoted === 'real' ? '✅ HUMAN' : '🤖 SUS'}
                          </span>
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (hasFired) return;
                          setFired(f => ({ ...f, [sub.id]: true }));
                          setSubmissions(subs => subs.map(s => s.id === sub.id ? { ...s, fires: (s.fires || 0) + 1 } : s));
                        }}
                        className={`px-4 py-2 rounded-xl border font-mono text-sm transition-all active:scale-90 ${
                          hasFired
                            ? 'bg-amber/20 border-amber/60 text-amber'
                            : 'bg-smoke border-ember text-dim hover:border-amber/40'
                        }`}
                      >
                        🔥 {sub.fires || 0}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleVote(sub.id, 'real')}
                        disabled={requireWorldIdToVote && !worldIdVerified}
                        className="py-3 rounded-xl bg-neon/10 border border-neon/40 text-neon font-display text-xl tracking-wide active:scale-95 transition-transform"
                      >
                        ✅ HUMAN
                      </button>
                      <button
                        onClick={() => handleVote(sub.id, 'fake')}
                        disabled={requireWorldIdToVote && !worldIdVerified}
                        className="py-3 rounded-xl bg-blood/10 border border-blood/40 text-blood font-display text-xl tracking-wide active:scale-95 transition-transform"
                      >
                        🤖 SUS
                      </button>
                    </div>
                  )}

                  {/* Expanded details */}
                  {expandedId === sub.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-ember pt-3 mt-3 space-y-2"
                    >
                      {/* Voter accuracy breakdown */}
                      {sub.accuracy != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-dim font-mono text-xs">Voter accuracy:</span>
                          <div className="flex-1 h-1.5 bg-ember rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${sub.accuracy}%`,
                                background: sub.accuracy >= 80 ? '#00FF94' : sub.accuracy >= 60 ? '#FFB800' : '#FF1A1A',
                              }}
                            />
                          </div>
                          <span className={`font-mono text-xs ${sub.accuracy >= 80 ? 'text-neon' : sub.accuracy >= 60 ? 'text-amber' : 'text-blood'}`}>
                            {sub.accuracy}%
                          </span>
                        </div>
                      )}

                      {/* Challenge button */}
                      <button
                        onClick={() => handleChallenge(sub)}
                        disabled={!sub.username}
                        className="w-full py-2.5 rounded-xl bg-smoke border border-ember text-dim font-mono text-xs active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {challengeToast === sub.id ? '🌐 Available in World App' : 'Challenge in World Chat →'}
                      </button>
                      {!sub.username && (
                        <p className="text-dim font-mono text-[10px] opacity-70">
                          Challenge requires a World username (captured on check-in).
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Expand/collapse toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                    className="w-full mt-3 py-1.5 text-dim font-mono text-xs opacity-60 hover:opacity-100 transition-opacity"
                  >
                    {expandedId === sub.id ? '▲ Less' : '▼ Details'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
