import { cx } from '@/lib/cx';

/**
 * Wordmark. "Bike" in ink, "Guard" in signal blue, matching the cover of the
 * Functional and Technical Specifications.
 */
export function Brand({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <span className={cx('font-condensed text-xl font-bold tracking-tight', className)}>
      <span className={invert ? 'text-white' : 'text-ink-900'}>Bike</span>
      <span className={invert ? 'text-signal-300' : 'text-signal-500'}>Guard</span>
    </span>
  );
}

