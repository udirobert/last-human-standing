import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRound } from '../world/RoundProvider.jsx';
import { useStats } from '../hooks/useStats.js';
import { usePolling } from '../hooks/usePolling.js';
import { useWorld } from '../world/WorldProvider.jsx';
import Countdown from './Countdown.jsx';
import FAQModal from './FAQModal.jsx';
import AmbientBackdrop from './AmbientBackdrop.jsx';
import GlitchTitle from './ui/GlitchTitle.jsx';
import Mascot from './Mascot.jsx';
import { PROFILE_TYPES } from './SurvivalProfile.jsx';

function shortAddr(addr) {
  if (!addr) return 'anon';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function relTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Default cap-shrink schedule for the pilot — shown as a roadmap during pre-launch.
const ELIM_SCHEDULE = [
  { day: 1, cap: 25, label: 'Day 1' },
  { day: 2, cap: 12, label: 'Day 2' },
  { day: 3, cap: 6, label: 'Day 3' },
  { day: 4, cap: 3, label: 'Day 4' },
  { day: 5, cap: 1, label: 'Final' },
];

export default function Leaderboard({ onBack, onCheckIn, onRouteToOnboarding }) {
  const [tab, setTab] = useState('today');
  const [peekPlayer, setPeekPlayer] = useState(null);
  const { phase, launchAt, currentDay, round, reservedCount, cohortSize, cohortFull } = useRound();
  const { stats } = useStats();
  const { user } = useWorld();
  const myAddr = user?.address?.toLowerCase() ?? null;

  const prizePoolWld = stats?.prizePool?.balanceWld ?? null;
  const prizePoolExplorer = stats?.prizePool?.explorerUrl ?? null;
  const totalPlayers = stats?.players?.total ?? reservedCount ?? 0;
  const activePlayers = stats?.players?.active ?? null;
  const cohortPct = cohortSize > 0 ? Math.min(100, Math.round((reservedCount / cohortSize) * 100)) : 0;

  const { data: checkins, loading: ckLoading } = usePolling('/api/checkins/today', {
    intervalMs: 15_000,
    transform: (json) => json.checkins ?? [],
    initial: [],
    deps: [currentDay],
  });
  const { data: roster } = usePolling('/api/cohort/roster', {
    intervalMs: 15_000,
    transform: (json) => json.roster ?? [],
    initial: [],
    deps: [currentDay],
  });
  const { data: refBoard } = usePolling('/api/referral-board', {
    intervalMs: 30_000,
    transform: (json) => json.board ?? [],
    initial: [],
  });
  const loading = ckLoading;

  const survivors = checkins.filter((c) => c.survived);
  const tooLate = checkins.filter((c) => !c.survived);
  const isPrelaunch = phase === 'prelaunch';
  const isLive = phase === 'live';

  return (
    <div className="relative min-h-screen bg-ash flex flex-col font-body pb-24 overflow-hidden">
      <AmbientBackdrop phase={isLive ? 'live' : 'prelaunch'} />
      {/* Header */}
      <div className="relative z-10 px-5 pt-12 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-smoke/70 border border-ember/40 flex items-center justify-center hover:border-amber/60 active:scale-90 transition-all" aria-label="Back">
            <span className="text-dim text-lg">←</span>
          </button>
          <div className="flex-1">
            <GlitchTitle text="STANDINGS" className="font-display text-3xl text-bone tracking-wide" />
            <p className="font-mono text-dim text-xs">
              {isLive ? `Day ${currentDay ?? '—'} · ${survivors.length}/${round?.survivalCap ?? '—'} arrived` : 'Pre-launch'}
            </p>
          </div>
          <FAQModal />
        </div>

        {/* Pre-launch: countdown + cohort progress */}
        {isPrelaunch && (
          <div className="bg-smoke border border-amber/40 rounded-3xl p-5 mb-3">
            <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Cohort #1 · Day 1 in</p>
            {launchAt
              ? <Countdown targetIso={launchAt} className="font-display text-4xl text-bone leading-none animate-glow" />
              : <p className="font-display text-2xl text-dim">TBA</p>}
            <div className="mt-3 flex items-center justify-between text-xs font-mono text-dim">
              <span>
                {reservedCount > 0
                  ? `${reservedCount.toLocaleString()} of ${cohortSize} humans confirmed`
                  : `${cohortSize} humans · be the first`}
              </span>
              <span>{cohortPct}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-ember rounded-full overflow-hidden">
              <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${cohortPct}%` }} />
            </div>
            {cohortFull && (
              <p className="text-neon text-xs font-mono mt-3">✓ Cohort full · waiting for launch</p>
            )}
          </div>
        )}

        {/* Prize pool spotlight */}
        <div className="bg-smoke border border-amber/40 rounded-3xl p-5 mb-3">
          <p className="font-mono text-amber text-xs tracking-widest uppercase mb-1">Prize Pool · World Chain</p>
          <div className="flex items-end gap-3 mb-1">
            <span className="font-display text-5xl text-amber leading-none">
              {prizePoolWld != null ? prizePoolWld.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
            </span>
            <span className="font-display text-2xl text-amber/60 mb-1">WLD</span>
          </div>
          <p className="text-dim text-xs font-mono">On-chain · grows with each entry fee</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="font-mono text-dim text-xs">Cohort</p>
              <p className="font-mono text-bone text-xs mt-0.5">{reservedCount}/{cohortSize}</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-dim text-xs">Alive</p>
              <p className="font-mono text-bone text-xs mt-0.5">{activePlayers ?? totalPlayers}</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-dim text-xs">Eliminated</p>
              <p className="font-mono text-bone text-xs mt-0.5">{totalPlayers > 0 && activePlayers != null ? totalPlayers - activePlayers : 0}</p>
            </div>
          </div>
          {prizePoolExplorer && (
            <button
              onClick={() => window.open(prizePoolExplorer, '_blank')}
              className="mt-3 w-full text-center font-mono text-amber/60 text-xs underline"
            >
              Verify on-chain →
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(isPrelaunch
            ? [
                { id: 'roster', label: 'Roster' },
                { id: 'referrals', label: 'Referrals' },
                { id: 'schedule', label: 'Schedule' },
              ]
            : [
                { id: 'today', label: 'Today' },
                { id: 'late', label: 'Too late' },
              ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all ${
                tab === t.id ? 'bg-blood text-bone' : 'bg-smoke text-dim border border-ember'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* PRE-LAUNCH: Roster */}
      {isPrelaunch && (tab === 'roster' || tab === 'today') && (
        <div className="px-5 space-y-2">
          <p className="text-dim text-xs font-mono uppercase tracking-wider mb-1">
            Reserved humans ({roster.length})
          </p>
          {loading && roster.length === 0 && (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl p-3 bg-smoke border border-ember animate-pulse">
                <div className="w-7 h-7 rounded-full bg-ember/30" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-ember/20 rounded w-2/3" />
                  <div className="h-2.5 bg-ember/20 rounded w-1/4" />
                </div>
              </div>
            ))
          )}
          {!loading && roster.length === 0 && (
            <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
              <p className="text-dim text-sm font-mono">No reservations yet.</p>
              <p className="text-bone text-xs font-mono mt-1 mb-3">Be first.</p>
              {onRouteToOnboarding && (
                <button
                  onClick={onRouteToOnboarding}
                  className="px-5 py-2.5 rounded-xl bg-blood text-bone font-display text-sm tracking-widest active:scale-95 transition-transform"
                >
                  RESERVE A SLOT →
                </button>
              )}
            </div>
          )}
          {roster.map((r, i) => {
            const isYou = myAddr && r.address?.toLowerCase() === myAddr;
            return (
              <motion.div
                key={r.address || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setPeekPlayer(r)}
                className={`flex items-center gap-3 rounded-2xl p-3 cursor-pointer hover:border-amber/40 transition-all ${
                  isYou ? 'bg-blood/10 border border-blood/40' : 'bg-smoke border border-ember'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-ember flex items-center justify-center font-display text-xs text-dim">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-sm truncate ${isYou ? 'text-blood' : 'text-bone'}`}>
                    {r.username ? `@${r.username}` : shortAddr(r.address)}
                    {isYou && <span className="text-blood text-xs ml-2">(you)</span>}
                  </p>
                  {r.reserved_at && (
                    <p className="text-dim text-[10px] font-mono mt-0.5">{relTime(r.reserved_at)}</p>
                  )}
                </div>
                <span className="text-amber text-xs font-mono">✓ in</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* PRE-LAUNCH: Referrals */}
      {isPrelaunch && tab === 'referrals' && (
        <div className="px-5 space-y-2">
          {/* Your referral link */}
          {(() => {
            const saved = (() => { try { return JSON.parse(localStorage.getItem('lhs_waitlist')); } catch { return null; } })();
            const code = saved?.referralCode;
            if (!code) return (
              <div className="bg-smoke border border-amber/30 rounded-2xl p-4 text-center">
                <p className="text-bone text-sm font-mono mb-1">Sign up on the Home tab to get your invite link</p>
                <p className="text-dim text-xs font-mono">Top referrers get priority check-in on Day 1</p>
              </div>
            );
            const url = `https://lasthumanstanding.thisyearnofear.com/?ref=${code}`;
            return (
              <div className="bg-smoke border border-neon/30 rounded-2xl p-4">
                <p className="text-neon font-mono text-xs tracking-widest uppercase mb-2">Your invite link</p>
                <div className="bg-ash border border-ember rounded-xl px-3 py-2 mb-3">
                  <p className="text-bone text-xs font-mono truncate">lasthumanstanding.thisyearnofear.com/?ref={code}</p>
                </div>
                <button
                  onClick={() => {
                    const text = `I just reserved my spot in Last Human Standing. Can you survive? 🧍`;
                    if (navigator.share) {
                      navigator.share({ title: 'Last Human Standing', text, url }).catch(() => {
                        navigator.clipboard?.writeText(`${text}\n${url}`);
                      });
                    } else {
                      navigator.clipboard?.writeText(`${text}\n${url}`);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber/10 border border-amber/40 font-mono text-amber text-sm tracking-wide active:scale-95 transition-transform"
                >
                  📣 Share your invite link
                </button>
              </div>
            );
          })()}

          <p className="text-dim text-xs font-mono uppercase tracking-wider mb-1 mt-3">
            🏆 Top referrers — priority check-in on Day 1
          </p>
          {refBoard.length === 0 ? (
            <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
              <p className="text-dim text-sm font-mono">No referrals yet.</p>
              <p className="text-bone text-xs font-mono mt-1">Be the first — share your link above!</p>
            </div>
          ) : (
            refBoard.map((r, i) => (
              <motion.div
                key={r.referralCode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 rounded-2xl p-3 ${
                  i === 0 ? 'bg-amber/10 border border-amber/40' : 'bg-smoke border border-ember'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs ${
                  i === 0 ? 'bg-amber/20 text-amber' : 'bg-ember text-dim'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-sm truncate ${i === 0 ? 'text-amber' : 'text-bone'}`}>
                    {r.name}
                  </p>
                </div>
                <span className={`text-xs font-mono ${i === 0 ? 'text-amber' : 'text-dim'}`}>
                  {r.count} invite{r.count !== 1 ? 's' : ''}
                </span>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* PRE-LAUNCH: Schedule */}
      {isPrelaunch && tab === 'schedule' && (
        <div className="px-5 space-y-2">
          <p className="text-dim text-xs font-mono uppercase tracking-wider mb-1">
            Elimination curve · {cohortSize} → 1
          </p>
          {ELIM_SCHEDULE.map((d, i) => {
            const prev = i === 0 ? cohortSize : ELIM_SCHEDULE[i - 1].cap;
            const dropped = prev - d.cap;
            return (
              <motion.div
                key={d.day}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-smoke border rounded-2xl p-4 flex items-center gap-3 ${
                  d.day === 5 ? 'border-amber/50' : 'border-ember'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                  d.day === 5 ? 'bg-amber/15 text-amber' : 'bg-ember text-bone'
                }`}>
                  <p className="font-mono text-[10px] uppercase">{d.day === 5 ? 'WIN' : 'D' + d.day}</p>
                </div>
                <div className="flex-1">
                  <p className={`font-display text-2xl ${d.day === 5 ? 'text-amber' : 'text-bone'}`}>
                    {d.cap === 1 ? 'Last human standing' : `First ${d.cap} survive`}
                  </p>
                  <p className="text-dim text-xs font-mono mt-0.5">
                    {dropped > 0 ? `−${dropped} cut` : ''}
                    {d.day === 5 ? ' · winner takes the pot' : ''}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <p className="text-dim text-xs font-mono text-center mt-3">
            Each day: a place type drops, 4-hour window, first N to check in survive.
          </p>
        </div>
      )}

      {/* LIVE: today's check-ins */}
      {isLive && tab === 'today' && (
        <div className="px-5 space-y-2">
          {loading && checkins.length === 0 && (
            <div className="text-center py-6">
              <div className="w-6 h-6 mx-auto rounded-full border-2 border-blood border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && survivors.length === 0 && (
            <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
              <p className="text-dim text-sm font-mono">No one has checked in yet.</p>
              <p className="text-bone text-xs font-mono mt-1 mb-3">Be first.</p>
              {onCheckIn && (
                <button
                  onClick={onCheckIn}
                  className="px-5 py-2.5 rounded-xl bg-blood text-bone font-display text-sm tracking-widest active:scale-95 transition-transform animate-pulse-blood"
                >
                  CHECK IN NOW →
                </button>
              )}
            </div>
          )}
          {survivors.map((c, i) => {
            const isYou = myAddr && c.address?.toLowerCase() === myAddr;
            return (
              <motion.div
                key={c.address || c.rank}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setPeekPlayer(c)}
                className={`flex items-center gap-3 rounded-2xl p-4 cursor-pointer hover:border-amber/40 transition-all ${
                  isYou ? 'bg-blood/10 border border-blood/40' : 'bg-smoke border border-ember'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg ${
                  c.rank === 1 ? 'text-amber' : c.rank <= 3 ? 'text-bone' : 'text-dim'
                }`}>
                  {c.rank <= 3 ? ['🥇', '🥈', '🥉'][c.rank - 1] : c.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm ${isYou ? 'text-blood' : 'text-bone'}`}>
                      {c.username || shortAddr(c.address)}
                    </span>
                    {isYou && <span className="font-mono text-blood text-xs">(you)</span>}
                  </div>
                  <p className="text-dim text-xs font-mono mt-0.5">
                    {c.distance_m != null ? `${Math.round(c.distance_m)}m from target` : ''}
                  </p>
                </div>
                <p className="text-neon text-xs font-mono">✓ alive</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {isLive && tab === 'late' && (
        <div className="px-5 space-y-2">
          {tooLate.length === 0 ? (
            <div className="bg-smoke border border-ember rounded-2xl p-6 text-center">
              <p className="text-dim text-sm font-mono">No late arrivals yet.</p>
            </div>
          ) : (
            tooLate.map((c, i) => (
              <motion.div
                key={c.address || c.rank}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setPeekPlayer(c)}
                className="bg-smoke border border-ember rounded-2xl p-4 flex items-center gap-3 opacity-60 cursor-pointer hover:border-amber/40 hover:opacity-90 transition-all"
              >
                <span className="text-2xl">💀</span>
                <div className="flex-1">
                  <p className="font-mono text-bone text-sm line-through">{c.username || shortAddr(c.address)}</p>
                  <p className="text-dim text-xs mt-0.5">Arrived as #{c.rank}</p>
                </div>
                <p className="font-mono text-dim text-xs">{c.distance_m != null ? `${Math.round(c.distance_m)}m` : ''}</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Profile Peek Overlay */}
      <AnimatePresence>
        {peekPlayer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setPeekPlayer(null)}
              className="fixed inset-0 bg-ash/80 z-40"
            />
            {/* Slide up card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-smoke border-t border-ember rounded-t-3xl p-6 z-50 shadow-2xl"
            >
              <div className="w-12 h-1 bg-ember/60 rounded-full mx-auto mb-4" />
              
              {(() => {
                const cleanAddr = peekPlayer.address?.toLowerCase().replace('0x', '') || '';
                const charSum = cleanAddr.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                
                const styles = ['adventurer', 'strategist', 'social', 'casual', 'spectator'];
                const vibes = ['competitive', 'casual', 'glory', 'experience'];
                const devices = ['phone', 'action', 'pro'];
                
                const style = styles[charSum % styles.length];
                const vibe = vibes[(charSum >> 2) % vibes.length];
                const device = devices[(charSum >> 4) % devices.length];
                
                const key = `${style}-${vibe}-${device}`;
                const profileType = PROFILE_TYPES[key] || { name: 'The Survivor', emoji: '🎯', color: '#FFB800', tagline: 'Forgetting limits, adapting to survive.' };
                
                const mascotVariants = ['excited', 'celebrating', 'focused', 'neutral'];
                const variant = mascotVariants[charSum % mascotVariants.length];
                
                return (
                  <div className="flex flex-col items-center text-center">
                    <Mascot variant={variant} size={100} />
                    
                    <h3 className="font-display text-3xl text-bone mt-4">
                      {peekPlayer.username ? `@${peekPlayer.username}` : shortAddr(peekPlayer.address)}
                    </h3>
                    <p className="text-dim text-xs font-mono select-all mt-1">{peekPlayer.address}</p>
                    
                    <div className="mt-4 p-4 w-full bg-ash border border-ember rounded-2xl">
                      <p className="text-dim text-[10px] font-mono uppercase tracking-widest mb-1">Survival Type</p>
                      <p className="font-display text-2xl" style={{ color: profileType.color }}>
                        {profileType.emoji} {profileType.name}
                      </p>
                      <p className="text-bone/90 font-mono text-xs mt-2 italic">"{profileType.tagline}"</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full mt-3">
                      <div className="bg-ash border border-ember rounded-2xl p-3">
                        <p className="text-dim text-[10px] font-mono uppercase">Status</p>
                        <p className="text-neon font-mono text-sm mt-1">✓ Active Cohort</p>
                      </div>
                      <div className="bg-ash border border-ember rounded-2xl p-3">
                        <p className="text-dim text-[10px] font-mono uppercase">Registered</p>
                        <p className="text-bone font-mono text-sm mt-1">
                          {peekPlayer.reserved_at ? relTime(peekPlayer.reserved_at) : 'Day 1'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setPeekPlayer(null)}
                      className="mt-6 w-full py-3 rounded-xl bg-ash border border-ember text-bone font-mono text-sm active:scale-95 transition-transform"
                    >
                      Close
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
