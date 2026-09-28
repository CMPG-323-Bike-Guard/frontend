import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
/**
 * Displays a compact labelled status using a predefined semantic tone.
 * 
 * Displays a small coloured indicator corresponding to a semantic status tone.
 */
type Tone = 'neutral' | 'ok' | 'warn' | 'alert' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-50 text-ink-700 border-ink-200',
  ok: 'bg-ok-100 text-ok-600 border-ok-500/25',
  warn: 'bg-warn-100 text-warn-600 border-warn-500/25',
  alert: 'bg-alert-100 text-alert-600 border-alert-500/25',
  info: 'bg-signal-50 text-signal-700 border-signal-300/50',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const dotTones: Record<Tone, string> = {
  neutral: 'bg-ink-300',
  ok: 'bg-ok-500',
  warn: 'bg-warn-500',
  alert: 'bg-alert-500',
  info: 'bg-signal-500',
};

export function StatusDot({ tone = 'neutral', className }: { tone?: Tone; className?: string }) {
  return <span aria-hidden="true" className={cx('inline-block h-2 w-2 shrink-0 rounded-full', dotTones[tone], className)} />;
}
