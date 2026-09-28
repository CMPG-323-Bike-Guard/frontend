import { cx } from '@/lib/cx';
import { Button } from './Button';

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
          <Button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            size="sm"
            variant={selected ? 'dark' : 'subtle'}
            className={selected ? 'cursor-pointer border border-ink-900' : undefined}
          >
            <span className="flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && (
                <span className={cx('text-xs', selected ? 'text-white/70' : 'text-ink-400')}>{option.count}</span>
              )}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
