import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/** An empty screen is an invitation to act, so an action is expected here. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      {icon && <span className="text-ink-300">{icon}</span>}
      <div>
        <p className="text-base font-semibold text-ink-900">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
