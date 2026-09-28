import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
/**
 * Provides the standard BikeGuard surface used to group related
 * content and actions.
 * 
 * CardHeader
 * Displays a card title with an optional description and action.
 * 
 */
export function Card({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return <Tag className={cx('rounded-card border border-ink-100 bg-white', className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('flex flex-wrap items-start justify-between gap-3 rounded-t-card border-b border-ink-100 bg-card-header px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500 prose-measure">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-5 py-4', className)}>{children}</div>;
}
