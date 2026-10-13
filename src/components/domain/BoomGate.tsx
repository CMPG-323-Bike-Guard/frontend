import { cx } from '@/lib/cx';

/**
 * The boom bar.
 *
 * This is the one piece of illustration in the interface and it is literal:
 * the bar sits down when the gate is holding and lifts when a crossing is
 * authorised, mirroring what the guard sees through the window.
 */
export function BoomGate({
  state,
  size = 'md',
}: {
  state: 'open' | 'held' | 'manual' | 'offline';
  size?: 'sm' | 'md';
}) {
  const width = size === 'sm' ? 'w-20' : 'w-32';
  const height = size === 'sm' ? 'h-2' : 'h-2.5';
  const postHeight = size === 'sm' ? 'h-8' : 'h-11';

  return (
    <div className={cx('relative flex items-end gap-1', size === 'sm' ? 'h-9' : 'h-12')} aria-hidden="true">
      <div className={cx('w-2.5 rounded-sm bg-ink-400', postHeight)} />
      <div className="absolute bottom-1 left-1.5 origin-left">
        <div
          className={cx(
            width,
            height,
            'rounded-sm transition-transform duration-500',
            state === 'open'
              ? 'boom-bar -rotate-[62deg]'
              : state === 'offline'
                ? 'bg-ink-500'
                : 'boom-bar',
            state === 'manual' && 'opacity-70',
          )}
        />
      </div>
    </div>
  );
}
