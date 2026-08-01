import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_SUBMISSIONS, resolveActiveTheme } from '../data/game';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useTrustTier } from '../hooks/useTrustTier.js';
import VoteGateBanner from './VoteGateBanner.jsx';
import { MiniKit } from "@worldcoin/minikit-js";
import FAQModal from './FAQModal.jsx';
import AppShell, { SHELL_BOTTOM_PAD } from './AppShell.jsx';
import GlitchTitle from './ui/GlitchTitle.jsx';
import { useDelight } from './DelightProvider.jsx';
import { useMascotEvent } from '../hooks/useMascotEvent.js';
import ThemeMotif from './ui/ThemeMotif.jsx';
import { MascotAvatar } from './Mascot.jsx';
import EmptyState from './EmptyState.jsx';
import VotePreview from './VotePreview.jsx';
import { HumanCta } from './ui/CraftCta.jsx';
import { haptic } from '../lib/haptics.js';
import ScreenLoader from './ui/ScreenLoader.jsx';
import { CUE_PRESS } from '../lib/cuelume.js';

const STATUS_COLORS = {
  verified: '#00FF94',
  pending: '#FFB800',
  flagged: '#FF1A1A',
};

const STATUS_LABELS = {
  verified: 'HUMAN',
  pending: 'ON TRIAL',
  flagged: 'SUS',
};

const STATUS_MASCOT = {
  verified: 'alive',
  pending: 'pending',
  flagged: 'eliminated',
};

function VerdictHour({ round }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isVerdictHour, setIsVerdictHour] = useState(false);

  useEffect(() => {
    const closesIso = round?.closesAt || round?.closes_at;
    if (!closesIso) return;

    const checkTime = () => {
      const closesAt = new Date(closesIso);
      const now = new Date();
      const hoursLeft = (closesAt - now) / (1000 * 60 * 60);

      setIsVerdictHour(hoursLeft <= 2 && hoursLeft > 0);

      if (hoursLeft > 0) {
        const hours = Math.floor(hoursLeft);
        const minutes = Math.floor((hoursLeft - hours) * 60);
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // check every minute
    return () => clearInterval(interval);
  }, [round?.closesAt, round?.closes_at]);

  if (!isVerdictHour) return null;

  return (
    <div className="mx-1 mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber/20 via-ember/20 to-amber/20 border border-amber/50 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg text-amber">⚖️ Verdict Hour</p>
          <p className="font-mono text-xs text-bone/80">Final votes needed</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-amber tabular-nums">{timeLeft}</p>
          <p className="font-mono text-xs text-bone/60">until close</p>
        </div>
      </div>
    </div>
  );
}

function JuryStakes() {
  // Matches award_streak_bonuses / BETA_ROADMAP: +1 correct vote, +1 at 3-day, +3 at 5-day.
  return (
    <div className="mx-1 mb-4 p-3 rounded-2xl bg-smoke/60 border border-ember/30">
      <p className="font-mono text-xs text-amber mb-2">🎫 Jury Rewards</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-display text-lg text-neon">+1</p>
          <p className="font-mono text-[10px] text-bone/60">per correct vote</p>
        </div>
        <div>
          <p className="font-display text-lg text-amber">+1</p>
          <p className="font-mono text-[10px] text-bone/60">3-day streak</p>
        </div>
        <div>
          <p className="font-display text-lg text-ember">+3</p>
          <p className="font-mono text-[10px] text-bone/60">5-day streak</p>
        </div>
      </div>
    </div>
  );
}

function LiveTally({ real = 0, fake = 0 }) {
  const total = real + fake;
  const realPct = total > 0 ? Math.round((real / total) * 100) : 50;
  const fakePct = total > 0 ? 100 - realPct : 50;
  return (
    <div className="mt-3">
      <div className="flex items-end justify-between mb-1.5">
        <div>
          <p className="font-mono text-[10px] text-neon uppercase tracking-widest">Human</p>
          <p className="font-display text-3xl text-neon leading-none tabular-nums">{real}</p>
        </div>
        <p className="font-mono text-dim text-xs pb-1 tabular-nums">
          {total === 0 ? 'awaiting votes' : `${realPct}% · ${fakePct}%`}
        </p>
        <div className="text-right">
          <p className="font-mono text-[10px] text-blood uppercase tracking-widest">Sus</p>
          <p className="font-display text-3xl text-blood leading-none tabular-nums">{fake}</p>
        </div>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border border-ember/40 bg-ash">
        <div
          className="h-full bg-neon transition-[width] duration-500 ease-out"
          style={{ width: `${realPct}%` }}
        />
        <div
          className="h-full bg-blood transition-[width] duration-500 ease-out"
          style={{ width: `${fakePct}%` }}
        />
      </div>
    </div>
  );
}

// Detective title based on votes resolved + accuracy
function getDetectiveTitle(resolved, accuracy) {
  if (resolved < 5) return 'Rookie Juror';
  const acc = accuracy ?? 0;
  if (resolved >= 20 && acc >= 0.9) return 'Sherlock 🔍';
  if (resolved >= 10 && acc >= 0.8) return 'Bloodhound 🐕';
  if (resolved >= 10) return 'Seasoned Juror';
  if (resolved >= 5) return 'Junior Detective';
  return 'Rookie Juror';
}

// Dev convenience: in development, fall back to MOCK_SUBMISSIONS when
// the user is NOT in the mini app. In production, always show real
// data — browser visitors are real players.
const useMocks = import.meta.env.DEV;

export default function Feed({ onBack, onCheckIn, onReserve }) {
  const { walletAuthed, entryPaid, sendWorldChat, isMiniApp } = useWorld();
  const { round, verification, phase, you, currentDay, lastUpdatedAt, refresh } = useRound();
  const { unlockAchievement, checkAchievement } = useDelight();
  const { dispatchMascotEvent } = useMascotEvent();
  const [submissions, setSubmissions] = useState(useMocks && !isMiniApp ? MOCK_SUBMISSIONS : []);
  const [voted, setVoted] = useState({});
  const [voteMeta, setVoteMeta] = useState({});
  const [voteFeedback, setVoteFeedback] = useState({}); // { id: { status, agree } }
  const [fired, setFired] = useState({});
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [challengeToast, setChallengeToast] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const { canVote, voteBlockedReason } = useTrustTier();
  const activeTheme = resolveActiveTheme(round);

  // Public read — spectators and eliminated players watch the same feed.
  // Only voting is gated (server-side + canVote), never watching.
  const loadFeed = useCallback(async () => {
    try {
      const resp = await fetch("/api/feed", { credentials: "include" });
      if (!resp.ok) {
        setLoadError(`feed_${resp.status}`);
        return;
      }
      setLoadError(null);
      const data = await resp.json();
      if (Array.isArray(data?.submissions)) {
        if (useMocks && !isMiniApp && data.submissions.length === 0) return;
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
            accuracy: s.accuracy ?? null,
            voteQuorum: s.voteQuorum || s.vote_quorum || null,
          })),
        );
      }
    } catch (error) {
      void error;
      setLoadError("feed_network");
    } finally {
      setLoading(false);
    }
  }, [isMiniApp]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFeed();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadFeed]);

  // The audit is a live spectacle — poll so tallies move without refresh.
  useEffect(() => {
    const id = setInterval(() => loadFeed(), 12_000);
    return () => clearInterval(id);
  }, [loadFeed]);

  // Auto-retry on network errors with a small backoff so the user
  // doesn't see a permanent "Live feed unavailable" state when the
  // cause is a transient Supabase blip. Capped at 3 attempts.
  useEffect(() => {
    if (!loadError || loadError === "challenge_failed") return undefined;
    const retryable = loadError.startsWith("feed_network") || loadError.startsWith("feed_5");
    if (!retryable) return undefined;
    let attempt = 0;
    const maxAttempts = 3;
    const tick = () => {
      attempt += 1;
      if (attempt > maxAttempts) return;
      setTimeout(() => loadFeed(), 5000 * attempt);
    };
    const id = setTimeout(tick, 5000);
    return () => clearTimeout(id);
  }, [loadError, loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleVote = async (id, type) => {
    if (!canVote) return;
    if (voted[id]) return;
    haptic(type === 'real' ? 'light' : 'warning');
    setVoted((v) => ({ ...v, [id]: type }));
    setSubmissions((subs) =>
      subs.map((s) =>
        s.id === id
          ? { ...s, votes: { ...s.votes, [type]: s.votes[type] + 1 } }
          : s,
      ),
    );

    // Achievement: first vote (press sound from data-cuelume-press on the button)
    unlockAchievement?.('first_vote');
    // Transient mascot reaction to the vote
    dispatchMascotEvent({
      type: "vote_react",
      variant: type === "real" ? "excited" : "thinking",
      message: null,
    });

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
          if (data?.juryWeight) {
            setVoteMeta((m) => ({ ...m, [id]: { juryWeight: data.juryWeight } }));
          }
          // Post-vote feedback: if the verdict resolved, show whether you agreed
          if (data?.status && data.status !== "pending") {
            const agreed = (data.status === "verified" && type === "real") ||
                           (data.status === "flagged" && type === "fake");
            setVoteFeedback((f) => ({ ...f, [id]: { status: data.status, agreed } }));
            // Auto-clear feedback after 4s
            setTimeout(() => setVoteFeedback((f) => { const n = { ...f }; delete n[id]; return n; }), 4000);
          }
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
    try {
      await sendWorldChat({ to: sub.username, message: msg });
    } catch (e) {
      setLoadError(`challenge_failed: ${e instanceof Error ? e.message : 'unknown'}`);
      setTimeout(() => setLoadError(null), 4000);
    }
  };

  const filtered = filter === 'all' ? submissions : submissions.filter((s) => s.status === filter);

  return (
    <AppShell phase={phase === 'live' ? 'live' : 'prelaunch'}>

      <div className="relative z-10 px-4 pt-10 pb-3 sticky top-0 bg-ash/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={onBack} {...CUE_PRESS} className="w-10 h-10 rounded-xl bg-smoke/70 border border-ember/40 flex items-center justify-center hover:border-amber/60 active:scale-[0.97] transition-transform" aria-label="Back">
            <span className="text-dim text-lg">←</span>
          </button>
          <div className="flex-1 min-w-0">
            <GlitchTitle text="THE AUDIT" className="font-display text-3xl text-bone tracking-wide" />
            <p className="font-mono text-dim text-[11px]">
              {phase === "live" && currentDay
                ? `Day ${currentDay} · ${activeTheme.theme} · HUMAN or SUS`
                : "Live trial · HUMAN or SUS"}
            </p>
          </div>
          <FAQModal />
        </div>

        <div className="flex gap-2 mb-2 items-center overflow-x-auto">
          {['all', 'pending', 'verified', 'flagged'].map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key)}
              {...CUE_PRESS}
              className={`px-3 py-1.5 rounded-full text-xs font-mono border shrink-0 active:scale-[0.97] transition-transform ${filter === key ? 'border-bone text-bone' : 'border-ember text-dim'}`}
            >
              {key === 'verified' ? 'HUMAN' : key === 'flagged' ? 'SUS' : key === 'pending' ? 'TRIAL' : 'ALL'}
            </button>
          ))}
          <button type="button" onClick={handleRefresh} {...CUE_PRESS} className="ml-auto px-3 py-1.5 rounded-full text-xs font-mono border border-ember text-dim shrink-0 active:scale-[0.97] transition-transform">
            {refreshing ? '...' : 'LIVE'}
          </button>
        </div>

        {you?.votesResolved > 0 && (
          <div className="mb-2 bg-smoke/60 border border-ember/30 rounded-xl px-3 py-2 flex items-center justify-between">
            <p className="font-display text-sm text-bone">{getDetectiveTitle(you.votesResolved, you.voteAccuracy)}</p>
            <p className="font-display text-lg text-neon tabular-nums">
              {you.voteAccuracy != null ? `${Math.round(you.voteAccuracy * 100)}%` : '—'}
            </p>
          </div>
        )}
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 space-y-5 ${SHELL_BOTTOM_PAD}`}>
        {useMocks && !isMiniApp && (
          <p className="text-amber font-mono text-xs text-center py-2 border border-amber/30 rounded-xl bg-amber/5 mx-1">
            Dev preview — sample submissions. Live data appears in production builds.
          </p>
        )}
        {loadError && (
          <div className="mx-1 space-y-2">
            <p className="text-blood font-mono text-xs text-center py-2 border border-blood/30 rounded-xl bg-blood/5">
              {loadError.startsWith("challenge_failed")
                ? "Couldn't send challenge via World Chat."
                : "Live feed unavailable."}
            </p>
            {!loadError.startsWith("challenge_failed") && (
              <HumanCta
                onClick={() => { setLoading(true); loadFeed(); refresh?.(); }}
                className="!py-3 !text-sm"
              >
                Retry feed →
              </HumanCta>
            )}
          </div>
        )}
        <VoteGateBanner onReserve={onReserve} />
        <VerdictHour round={round} />
        <JuryStakes />
        {phase !== "prelaunch" && (
          <p className="mx-1 px-3 py-2 rounded-xl border border-ember/30 bg-smoke/50 font-mono text-[10px] text-dim leading-relaxed text-center">
            Vote the proof, not the person. Don&apos;t redistribute photos off the app.
            {lastUpdatedAt ? ` · checked ${new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        )}
        {loading && submissions.length === 0 && (
          <ScreenLoader kind="list" />
        )}

        {!loading && filtered.length === 0 && (
          phase === "prelaunch" ? (
            <VotePreview />
          ) : (
            <EmptyState
              motif="coffee"
              title={`No submissions yet for ${activeTheme.theme}`}
              body={
                !canVote
                  ? (voteBlockedReason || "Voting is locked until you reserve and sign in. You can still watch proofs arrive.")
                  : onCheckIn && walletAuthed && entryPaid
                    ? "Be the first proof of the day — then come back to audit the field."
                    : "Submissions appear here the moment players check in."
              }
              action={
                !canVote && onReserve ? (
                  <HumanCta onClick={onReserve}>Reserve to unlock voting →</HumanCta>
                ) : onCheckIn && walletAuthed && entryPaid ? (
                  <HumanCta onClick={onCheckIn}>Be the first to check in →</HumanCta>
                ) : onReserve ? (
                  <HumanCta onClick={onReserve}>Reserve your slot →</HumanCta>
                ) : null
              }
            />
          )
        )}

        <AnimatePresence>
          {filtered.map((sub, idx) => {
            const totalVotes = (sub.votes?.real || 0) + (sub.votes?.fake || 0);
            const quorum = sub.voteQuorum || verification.voteQuorum;
            const progress = Math.min(100, Math.round((totalVotes / Math.max(1, quorum)) * 100));
            const isExpanded = expandedId === sub.id;
            const myVote = voted[sub.id];
            const themeEmoji = activeTheme.emoji;

            return (
              <motion.article
                key={sub.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-smoke border border-ember rounded-3xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="w-full text-left relative"
                >
                  {sub.mediaUrl ? (
                    <img
                      src={sub.mediaUrl}
                      alt={sub.caption}
                      className="w-full aspect-[4/5] max-h-[70vh] object-cover bg-ash"
                    />
                  ) : (
                    <div className="w-full aspect-[4/5] max-h-[70vh] flex items-center justify-center bg-ash/80">
                      <ThemeMotif emoji={themeEmoji} size={96} label={activeTheme.theme} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-ash/80 backdrop-blur text-bone border border-ember/50">
                      {sub.user}
                    </span>
                    <span
                      className="font-mono text-[10px] px-2 py-1 rounded-full bg-ash/80 backdrop-blur tracking-widest flex items-center gap-1"
                      style={{ color: STATUS_COLORS[sub.status], border: `1px solid ${STATUS_COLORS[sub.status]}88` }}
                    >
                      <MascotAvatar status={STATUS_MASCOT[sub.status]} size={16} />
                      {STATUS_LABELS[sub.status]}
                    </span>
                  </div>
                </button>

                <div className="p-4 pt-3">
                  {sub.caption && (
                    <p className="text-bone text-sm leading-relaxed mb-1">{sub.caption}</p>
                  )}

                  <LiveTally real={sub.votes.real} fake={sub.votes.fake} />

                  <div className="mt-2 h-1 bg-ash rounded-full overflow-hidden">
                    <div className="h-full bg-amber/70 rounded-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-dim text-[10px] font-mono mt-1">
                    Quorum {totalVotes}/{quorum}
                    {myVote ? ` · you voted ${myVote === 'real' ? 'HUMAN' : 'SUS'}` : ''}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleVote(sub.id, 'real')}
                      disabled={Boolean(myVote) || !canVote}
                      data-cuelume-press="chime"
                      data-cuelume-release="release"
                      className={`py-4 rounded-2xl font-display text-xl tracking-widest active:scale-[0.97] transition-transform disabled:opacity-45 ${
                        myVote === 'real'
                          ? 'bg-neon text-ash border-2 border-neon'
                          : 'bg-neon/15 border-2 border-neon/50 text-neon'
                      }`}
                    >
                      HUMAN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote(sub.id, 'fake')}
                      disabled={Boolean(myVote) || !canVote}
                      data-cuelume-press="press"
                      data-cuelume-release="release"
                      className={`py-4 rounded-2xl font-display text-xl tracking-widest active:scale-[0.97] transition-transform disabled:opacity-45 ${
                        myVote === 'fake'
                          ? 'bg-blood text-bone border-2 border-blood'
                          : 'bg-blood/15 border-2 border-blood/50 text-blood'
                      }`}
                    >
                      SUS
                    </button>
                  </div>

                  {voteMeta[sub.id]?.juryWeight > 1 && (
                    <p className="text-amber font-mono text-[10px] mt-2 text-center">
                      Jury vote — counted ×{voteMeta[sub.id].juryWeight}
                    </p>
                  )}

                  {voteFeedback[sub.id] && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-2 py-2 px-3 rounded-xl text-center font-mono text-xs ${
                        voteFeedback[sub.id].agreed
                          ? 'bg-neon/10 border border-neon/30 text-neon'
                          : 'bg-blood/10 border border-blood/30 text-blood'
                      }`}
                    >
                      {voteFeedback[sub.id].agreed ? '✓ You were right' : '✗ You were wrong'}
                      {' · '}
                      Verdict: {voteFeedback[sub.id].status === 'verified' ? 'HUMAN' : 'SUS'}
                    </motion.div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleChallenge(sub)}
                        {...CUE_PRESS}
                        className="w-full py-3 rounded-2xl bg-amber/10 border border-amber/30 text-amber font-mono text-sm active:scale-[0.97] transition-transform"
                      >
                        Challenge in chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setFired((v) => ({ ...v, [sub.id]: !v[sub.id] }))}
                        {...CUE_PRESS}
                        className={`w-full py-3 rounded-2xl border font-mono text-sm active:scale-[0.97] transition-transform ${
                          fired[sub.id]
                            ? "bg-amber/15 border-amber/40 text-amber"
                            : "bg-ash border-ember text-dim"
                        }`}
                      >
                        {fired[sub.id] ? "Ember lit" : "Send an ember"}
                      </button>
                      {challengeToast === sub.id && (
                        <p className="text-amber font-mono text-xs text-center">Open inside World App to challenge via chat.</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
