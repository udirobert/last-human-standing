import { memo } from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '../../hooks/useCountdown.js';

function formatClosingTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/**
 * UrgencyDial — adaptive time indicator for the Survive tab.
 * Rather than a noisy second-by-second countdown, it adapts into 3 intuitive states:
 * 1. Calm Window (>4h): Shows target closing time with calm green/ash styling
 * 2. Warm Horizon (2-4h): Amber countdown badge showing remaining hours & minutes
 * 3. Verdict Hour (<2h): Pulsing crimson-amber emergency badge alerting the user
 */
function UrgencyDial({
  targetIso,
  isLive = true,
  className = '',
}) {
  const { totalHours, hours, minutes, ms } = useCountdown(targetIso, 15_000);

  if (!targetIso || ms <= 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ash/60 border border-ember/40 text-dim font-mono text-[11px] ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-dim" />
        <span>Window closed</span>
      </div>
    );
  }

  const formattedTime = formatClosingTime(targetIso);
  const isVerdictHour = totalHours <= 2;
  const isWarm = totalHours <= 4 && totalHours > 2;

  // 1. Verdict Hour (<2h) — High urgency pulse
  if (isVerdictHour) {
    return (
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blood/15 border border-blood/50 text-amber font-mono text-xs shadow-sm ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blood opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blood" />
        </span>
        <span className="font-semibold tracking-wide text-bone">
          Verdict Hour:
        </span>
        <span className="tabular-nums text-amber font-bold">
          {hours}h {minutes}m left
        </span>
      </motion.div>
    );
  }

  // 2. Warm horizon (2h to 4h) — Warm amber reminder
  if (isWarm) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber/10 border border-amber/35 text-amber font-mono text-[11px] ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
        <span className="text-bone/80">Closes in</span>
        <span className="font-semibold tabular-nums text-amber">
          {hours}h {minutes}m
        </span>
      </div>
    );
  }

  // 3. Calm window (>4h) — Informative closing time
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ash/50 border border-ember/40 text-bone/70 font-mono text-[11px] ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-neon" />
      <span>Closes {formattedTime ? `at ${formattedTime}` : `in ${Math.round(totalHours)}h`}</span>
    </div>
  );
}

export default memo(UrgencyDial);
