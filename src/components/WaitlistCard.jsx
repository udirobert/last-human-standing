import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCta } from './ui/CraftCta.jsx';

/**
 * WaitlistCard — captures bounced visitors on the welcome screen.
 * Two optional fields: X / Twitter handle and email. At least one
 * must be present (validated server-side; we accept the form
 * either way and let the server silently drop invalid input).
 *
 * On success the card swaps to a "You're on the list" confirmation.
 * We never reveal whether the handle/email already existed — the
 * server returns 200 either way.
 */
export default function WaitlistCard({ source = 'welcome_screen', variant = 'default', className = '' }) {
  const [xHandle, setXHandle] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const isCohort2 = variant === 'cohort2' || source === 'cohort_2';

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const resp = await fetch('/api/waitlist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_handle: xHandle.trim() || undefined,
          email: email.trim() || undefined,
          source: isCohort2 ? 'cohort_2' : source,
        }),
      });
      if (!resp.ok) throw new Error(`waitlist_${resp.status}`);
      setStatus('done');
    } catch (err) {
      console.error('waitlist submit failed', err);
      setStatus('error');
    }
  };

  return (
    <div
      className={
        'bg-smoke/70 border border-ember/40 rounded-2xl p-4 backdrop-blur-sm ' + className
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center py-1"
          >
            <div className="text-2xl mb-1" aria-hidden>
              ✓
            </div>
            <p className="font-display text-base text-bone tracking-wider uppercase">
              You&apos;re on the list
            </p>
            <p className="font-mono text-xs text-dim mt-1">
              {isCohort2
                ? "We'll ping you when cohort 2 opens."
                : "We'll ping you when the next cohort launches."}
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={onSubmit}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base" aria-hidden>
                🔔
              </span>
              <p className="font-mono text-dim text-[10px] uppercase tracking-widest">
                {isCohort2 ? "Notify me · cohort 2" : "Notify me · next cohort"}
              </p>
            </div>
            <p className="font-mono text-xs text-bone mb-3 leading-relaxed">
              {isCohort2
                ? "Drop a handle or email — we'll ping you the moment cohort 2 opens."
                : "Don't have a slot yet? Drop a handle or email and we'll ping you the moment the cohort opens."}
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="X / Twitter handle (no @)"
                autoComplete="off"
                maxLength={15}
                className="w-full bg-ash border border-ember/40 rounded-lg px-3 py-2 font-mono text-sm text-bone placeholder:text-dim focus:outline-none focus:border-blood/70 transition-colors"
              />
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-dim shrink-0">or</span>
                <div className="flex-1 h-px bg-ember/30" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                autoComplete="off"
                maxLength={200}
                className="w-full bg-ash border border-ember/40 rounded-lg px-3 py-2 font-mono text-sm text-bone placeholder:text-dim focus:outline-none focus:border-blood/70 transition-colors"
              />
            </div>
            <GameCta
              type="submit"
              disabled={status === 'submitting'}
              className="mt-3 !max-w-none !py-2.5 !rounded-lg !font-display !text-sm tracking-widest uppercase"
            >
              {status === 'submitting' ? 'sending…' : status === 'error' ? 'retry' : 'notify me →'}
            </GameCta>
            <p className="text-[10px] font-mono text-dim mt-2 text-center">
              We never share or sell contact info.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
