import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export function StatTile({
  label,
  value,
  detail,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'alert';
  icon?: ReactNode;
}) {
  const accents = {
    neutral: 'text-ink-900',
    ok: 'text-ok-600',
    warn: 'text-warn-600',
    alert: 'text-alert-600',
  };
  return (
    <div className="rounded-card border border-ink-100 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className="grid h-5 w-5 shrink-0 place-items-center rounded-control bg-card-header text-brand-purple"
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cx('mt-1 text-3xl font-semibold', accents[tone])}>{value}</p>
      {detail && <p className="mt-1 text-sm text-ink-500">{detail}</p>}
    </div>
  );
}
