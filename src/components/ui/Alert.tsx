import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';
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
  variant = 'default',
  onDismiss,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  variant?: 'default' | 'orange';
  onDismiss?: () => void;
}) {
  const isLive = tone === 'alert' || tone === 'warn';
  const icon = variant === 'orange'
    ? <AlertTriangle className="h-5 w-5 text-tag-notice-orange" />
    : tones[tone].icon;

  return (
    <div
      role={isLive ? 'alert' : 'status'}
      className={cx(
        'flex gap-3 rounded-card border px-4 py-3',
        variant === 'orange'
          ? 'border-tag-notice-orange/40 bg-tag-notice-orange/10 text-ink-900'
          : tones[tone].wrap,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-ink-900">{title}</p>}
        {children && <div className={cx('prose-measure', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 self-start rounded-control p-1 cursor-pointer text-tag-notice-orange hover:bg-tag-notice-orange/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tag-notice-orange"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
