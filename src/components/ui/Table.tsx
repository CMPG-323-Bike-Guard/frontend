import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Tables scroll horizontally on small screens rather than collapsing, because
 * the audit columns (time, gate, card reference, result) only make sense read
 * together.
 */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0', className)}>
      <table className="w-full min-w-[44rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, align = 'left' }: { children: ReactNode; className?: string; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cx(
        'border-b border-ink-100 pb-2 pr-4 text-xs font-semibold text-ink-500',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align = 'left' }: { children: ReactNode; className?: string; align?: 'left' | 'right' }) {
  return (
    <td className={cx('border-b border-ink-100 py-2.5 pr-4 align-middle', align === 'right' ? 'text-right' : 'text-left', className)}>
      {children}
    </td>
  );
}
