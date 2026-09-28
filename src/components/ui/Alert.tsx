import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { cx } from '@/lib/cx';
/**
 * Displays an informational, successful, warning, or critical message.
 * 
 * The component provides:
 * - A semantic visual tone.
 * - An appropriate status icon.
 * - An optional title.
 * - Optional message content.
 * - An optional action element.
 * - Accessible ARIA behaviour for live warnings and alerts.
 * 
 * Warning and critical alerts use `role="alert"` so important
 * messages can be announced immediately by assistive technologies.
 * Informational and successful messages use `role="status"`.
 */
type Tone = 'info' | 'ok' | 'warn' | 'alert';

const tones: Record<Tone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: 'border-signal-300/60 bg-signal-50 text-ink-800', icon: <Info className="h-5 w-5 text-signal-600" /> },
  ok: { wrap: 'border-ok-500/25 bg-ok-100 text-ink-800', icon: <CheckCircle2 className="h-5 w-5 text-ok-600" /> },
  warn: { wrap: 'border-warn-500/30 bg-warn-100 text-ink-800', icon: <AlertTriangle className="h-5 w-5 text-warn-600" /> },
  alert: { wrap: 'border-alert-500/30 bg-alert-100 text-ink-800', icon: <OctagonAlert className="h-5 w-5 text-alert-600" /> },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const isLive = tone === 'alert' || tone === 'warn';
  return (
    <div
      role={isLive ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-card border px-4 py-3', tones[tone].wrap, className)}
    >
      <span className="mt-0.5 shrink-0">{tones[tone].icon}</span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-ink-900">{title}</p>}
        {children && <div className={cx('prose-measure', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
