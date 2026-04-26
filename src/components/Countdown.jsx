import { useEffect, useState } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

function diff(targetMs) {
  const ms = Math.max(0, targetMs - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { ms, days, hours, minutes, seconds };
}

export default function Countdown({ targetIso, className = '' }) {
  const targetMs = targetIso ? Date.parse(targetIso) : null;
  const [now, setNow] = useState(() => diff(targetMs ?? Date.now()));

  useEffect(() => {
    if (!targetMs) return;
    const t = setInterval(() => setNow(diff(targetMs)), 1000);
    return () => clearInterval(t);
  }, [targetMs]);

  if (!targetMs) return <span className={className}>—</span>;

  if (now.ms <= 0) {
    return <span className={className}>00:00:00</span>;
  }

  if (now.days > 0) {
    return (
      <span className={className}>
        {now.days}d {pad(now.hours)}:{pad(now.minutes)}:{pad(now.seconds)}
      </span>
    );
  }

  return (
    <span className={className}>
      {pad(now.hours)}:{pad(now.minutes)}:{pad(now.seconds)}
    </span>
  );
}
