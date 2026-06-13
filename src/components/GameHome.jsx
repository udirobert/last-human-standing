import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorld } from '../world/WorldProvider.jsx';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import { usePolling } from '../hooks/usePolling.js';
import Countdown from './Countdown.jsx';
import MissionBoard from './MissionBoard.jsx';
import TrustBadge from './TrustBadge.jsx';
import ModeBanner from './ModeBanner.jsx';
import ActivityFeed from './ActivityFeed.jsx';

export default function GameHome({ onCheckIn, onViewFeed, onViewChat, onViewLeaderboard, onViewHistory }) {
  const { user, isWorldApp, isMiniApp } = useWorld();
  const {
    phase, launchAt, currentDay,
    cohortSize, reservedCount, cohortFull,
  } = useRound();
  const { stats } = useStats();

  const [inviteText, setInviteText] = useState('📣 Share your invite link');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [waitlistState, setWaitlistState] = useState(() => {
    try {
      const saved = localStorage.getItem('lhs_waitlist');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      void error;
      return null;
    }
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const [referredBy] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('ref') || null; } catch { return null; }
  });

  const { data: refBoard } = usePolling('/api/referral-board', {
    intervalMs: 30_000,
    transform: (json) => json.board ?? [],
    initial: [],
  });

  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;
  const eliminated = totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0;

  const prizeWld = stats?.prizePool?.balanceWld ?? null;
  const prizeDisplay = prizeWld != null && prizeWld > 0
    ? `${prizeWld.toLocaleString(undefined, { maximumFractionDigits: 2 })} WLD`
    : (reservedCount > 0 ? `${reservedCount} WLD` : '0 WLD');
  const prizeExplorer = stats?.prizePool?.explorerUrl ?? null;

  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';

  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  return (
    <div className="min-h-screen bg-ash flex flex-col font-body pb-24">
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isLive ? 'bg-neon' : 'bg-amber'}`} />
            <span className={`font-mono text-xs tracking-widest uppercase ${isLive ? 'text-neon' : 'text-amber'}`}>
              {isPrelaunch ? 'Pre-launch' : isLive ? `Live · Day ${currentDay ?? '—'}` : 'Ended'}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center justify-end gap-1.5">
              <TrustBadge />
              <ModeBanner />
            </div>
            <button
              onClick={onViewHistory}
              className="font-mono text-dim text-xs hover:text-bone transition-colors underline decoration-dotted underline-offset-2"
            >
              {user?.displayName ?? 'anon'}
            </button>
          </div>
        </div>
        <h1 className="font-display text-4xl text-bone tracking-wide animate-glow">LAST HUMAN STANDING</h1>
      </div>

      <MissionBoard
        onCheckIn={onCheckIn}
        onViewFeed={onViewFeed}
        isDemoMode={!isMiniApp}
      />

      <ActivityFeed />

      {isPrelaunch && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mb-4">
          <div className="bg-smoke border border-amber/40 rounded-3xl p-6 relative overflow-hidden">
                <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Day 1 in</p>
            {launchAt
              ? <Countdown targetIso={launchAt} className="font-display text-5xl text-bone leading-none animate-glow" />
              : <p className="font-display text-3xl text-dim">TBA</p>}
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-dim">
              <span>{reservedCount.toLocaleString()} of {cohortSize} players joined</span>
              <span>{cohortPct}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-ember rounded-full overflow-hidden">
              <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${cohortPct}%` }} />
            </div>
            {cohortFull && (
              <p className="text-neon text-xs font-mono mt-3">✓ Season full · waiting for launch</p>
            )}
          </div>
          {!waitlistState ? (
            <div className="mt-4 bg-smoke border border-ember rounded-2xl p-4">
              <p className="font-mono text-bone text-sm mb-1">🧍 First time here?</p>
              <p className="text-dim text-xs font-mono mb-3">We'll notify you when Day 1 opens. {!isWorldApp && 'Download World App to play for real.'}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-ash border border-ember rounded-xl px-3 py-2.5 text-bone text-sm font-mono placeholder:text-dim/50 outline-none focus:border-amber transition-colors"
                />
                <button
                  disabled={submitting}
                  onClick={async () => {
                    if (!email) return;
                    setSubmitting(true);
                    try {
                      const resp = await fetch('/api/waitlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, referredBy }),
                      });
                      const json = await resp.json();
                      if (json.ok) {
                        const state = { referralCode: json.referralCode, referralCount: json.referralCount || 0 };
                        setWaitlistState(state);
                        localStorage.setItem('lhs_waitlist', JSON.stringify(state));
                      }
                    } catch (error) {
                      void error;
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="bg-amber text-ash font-mono text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
                >
                  {submitting ? '...' : 'Reserve →'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-smoke border border-neon/30 rounded-2xl p-4">
              <p className="text-neon font-mono text-sm mb-2">✓ You're on the list!</p>
              <p className="text-dim text-xs font-mono mb-3">Top referrers get priority check-in on Day 1. Share your link to climb the leaderboard:</p>
              <div className="bg-ash border border-ember rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                <span className="text-bone text-xs font-mono truncate flex-1">lasthumanstanding.thisyearnofear.com/?ref={waitlistState.referralCode}</span>
              </div>
              <button
                onClick={() => {
                  const url = `https://lasthumanstanding.thisyearnofear.com/?ref=${waitlistState.referralCode}`;
                  const text = `I just reserved my spot in Last Human Standing. Can you survive? 🧍`;
                  const showSuccess = () => {
                    setInviteText('✓ Copied! Now share it');
                    setTimeout(() => setInviteText('📣 Share your invite link'), 3000);
                  };
                  if (navigator.share) {
                    navigator.share({ title: 'Last Human Standing', text, url }).then(() => {
                      setInviteText('✓ Shared!');
                      setTimeout(() => setInviteText('📣 Share your invite link'), 3000);
                    }).catch(() => {
                      navigator.clipboard?.writeText(`${text}\n${url}`);
                      showSuccess();
                    });
                  } else {
                    navigator.clipboard?.writeText(`${text}\n${url}`);
                    showSuccess();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-amber/10 border border-amber/40 font-mono text-amber text-sm tracking-wide active:scale-95 transition-transform"
              >
                {inviteText}
              </button>
            </div>
          )}

          {refBoard.length > 0 && (
            <div className="mt-3 bg-smoke border border-ember rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-bone text-xl">REFERRAL BOARD</p>
                <p className="font-mono text-dim text-xs">Top 5</p>
              </div>
              <div className="space-y-2">
                {refBoard.slice(0, 5).map((row, i) => (
                  <div key={`${row.referralCode}-${i}`} className="flex items-center justify-between bg-ash rounded-xl px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-dim text-xs w-5">#{i + 1}</span>
                      <span className="text-bone text-sm truncate">{row.name}</span>
                    </div>
                    <span className="font-mono text-amber text-xs">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="px-5 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-smoke rounded-2xl p-4 border border-ember">
          <p className="text-dim text-xs font-mono mb-1">Prize Pool</p>
          <p className="font-display text-2xl text-amber leading-none">{prizeDisplay}</p>
          {prizeExplorer && <a href={prizeExplorer} target="_blank" rel="noopener" className="text-[10px] font-mono text-dim underline">view on chain</a>}
        </div>
        <div className="bg-smoke rounded-2xl p-4 border border-ember">
          <p className="text-dim text-xs font-mono mb-1">Survivors</p>
          <p className="font-display text-2xl text-bone leading-none">{activePlayers ?? '—'}</p>
          <p className="text-[10px] font-mono text-dim mt-1">{eliminated} out</p>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <button onClick={onViewFeed} className="bg-smoke border border-ember rounded-2xl py-4 text-bone font-mono text-sm">Feed</button>
          <button onClick={onViewChat} className="bg-smoke border border-ember rounded-2xl py-4 text-bone font-mono text-sm">Chat</button>
          <button onClick={onViewLeaderboard} className="bg-smoke border border-ember rounded-2xl py-4 text-bone font-mono text-sm">Board</button>
        </div>

        {pwaPrompt && !pwaDismissed && (
          <div className="bg-smoke border border-amber/30 rounded-2xl p-4">
            <p className="font-mono text-bone text-sm mb-2">Install this app for faster daily check-ins</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await pwaPrompt.prompt();
                  setPwaPrompt(null);
                }}
                className="flex-1 bg-amber text-ash font-mono text-sm py-2.5 rounded-xl"
              >
                Install
              </button>
              <button
                onClick={() => setPwaDismissed(true)}
                className="px-4 py-2.5 rounded-xl border border-ember text-dim font-mono text-sm"
              >
                Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
