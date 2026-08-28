import { useCountdown } from '../hooks/useCountdown.js';

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function Countdown({ targetIso, className = '' }) {
  const { targetMs, ms, days, hours, minutes, seconds } = useCountdown(targetIso);

  if (!targetMs) return <span className={`tabular-nums ${className}`}>—</span>;

  if (ms <= 0) {
    return <span className={`tabular-nums ${className}`}>00:00:00</span>;
  }

  if (days > 0) {
    return (
      <span className={`tabular-nums ${className}`}>
        {days}d {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  return (
    <span className={`tabular-nums ${className}`}>
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
