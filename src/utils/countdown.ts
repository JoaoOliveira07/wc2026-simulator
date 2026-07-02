import { useState, useEffect } from 'react';

export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const onVisibility = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, [intervalMs]);
  return now;
}

// Returns "em Xh" / "em Xmin" for kickoffs within 48h, null otherwise
export function formatCountdown(kickoff: Date, now: number): string | null {
  const diff = kickoff.getTime() - now;
  if (diff <= 0 || diff > 48 * 3600_000) return null;
  if (diff < 3600_000) return `em ${Math.floor(diff / 60_000)}min`;
  return `em ${Math.round(diff / 3600_000)}h`;
}
