import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { ALARM_ACK_WARNING_SECONDS } from '@/lib/constants';
import { cx } from '@/lib/cx';

/** Ticks once a second so the countdown stays live without refetching. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function mmss(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Response timer: shows how long the guard has left to acknowledge an alarm
 * before it is escalated to the supervisor. The deadline comes from the
 * server (`alarm.acknowledgeBy`), so every screen counts down to the same time.
 */
export function AlarmCountdown({ deadline }: { deadline: string }) {
  const now = useNow();
  const remaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
  const expired = remaining === 0;
  const urgent = remaining <= ALARM_ACK_WARNING_SECONDS;

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={expired ? 'Acknowledgement deadline passed' : `${remaining} seconds left to acknowledge`}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        expired || urgent
          ? 'border-alert-500/40 bg-alert-100 text-alert-600'
          : 'border-tag-notice-orange/40 bg-tag-notice-orange/10 text-tag-notice-orange',
        urgent && !expired && 'animate-pulse',
      )}
    >
      <Timer className="h-3.5 w-3.5" aria-hidden="true" />
      {expired ? 'Escalating to supervisor…' : `Acknowledge within ${mmss(remaining)}`}
    </span>
  );
}