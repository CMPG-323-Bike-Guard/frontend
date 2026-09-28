import { cx } from '@/lib/cx';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Filter chips used for status and result filters. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange(value: T): void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors',
              selected
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cx('ml-1.5 text-xs', selected ? 'text-white/70' : 'text-ink-400')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
