import { Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '@/api/realtime';
import { cx } from '@/lib/cx';

/**
 * Integration Matrix, Technical Specification 6.2: while the WebSocket is
 * down the dashboard must say so rather than quietly showing stale state.
 */
export function ConnectionIndicator({ state, className }: { state: ConnectionState; className?: string }) {
  const meta = {
    connecting: { label: 'Connecting to the gate feed', tone: 'text-warn-500', icon: Wifi },
    connected: { label: 'Live', tone: 'text-ok-500', icon: Wifi },
    disconnected: { label: 'Connection lost — reconnecting', tone: 'text-alert-500', icon: WifiOff },
  }[state];
  const Icon = meta.icon;

  return (
    <p className={cx('flex items-center gap-2 text-sm font-medium', meta.tone, className)} role="status" aria-live="polite">
      <Icon className={cx('h-4 w-4', state === 'connecting' && 'animate-pulse')} aria-hidden="true" />
      {meta.label}
    </p>
  );
}
