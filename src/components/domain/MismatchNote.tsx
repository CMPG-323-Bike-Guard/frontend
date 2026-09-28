import type { MismatchReason } from '@/types';
import { MISMATCH_REASON_META } from '@/lib/constants';
import { cx } from '@/lib/cx';

/**
 * UC-03 error flow: a tag that has never been registered is shown differently
 * from one registered to somebody else, so a guard can judge the risk quickly.
 */
export function MismatchNote({ reason, className }: { reason: MismatchReason | null; className?: string }) {
  if (!reason) return null;
  const meta = MISMATCH_REASON_META[reason];
  const tones = {
    high: 'border-alert-500/40 bg-alert-100 text-alert-600',
    medium: 'border-warn-500/40 bg-warn-100 text-warn-600',
    low: 'border-ink-200 bg-ink-50 text-ink-700',
  };
  return (
    <div className={cx('rounded-control border px-3 py-2', tones[meta.risk], className)}>
      <p className="text-sm font-semibold">{meta.label}</p>
      <p className="mt-0.5 text-sm text-ink-700">{meta.detail}</p>
    </div>
  );
}
