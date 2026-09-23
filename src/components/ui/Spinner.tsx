import { cx } from '@/lib/cx';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-signal-500', className)}
    />
  );
}

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-ink-500">{label}…</p>
    </div>
  );
}

/** Skeleton rows keep table layout stable while a query is in flight. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-control bg-ink-50" />
      ))}
    </div>
  );
}
