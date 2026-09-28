import { useId, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Every control is wired to its label and, when invalid, to its message via
 * aria-describedby, so screen readers announce the error with the field.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const describedBy = error || hint ? messageId : undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-800">
        {label}
        {required && (
          <span className="ml-1 text-alert-500" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {(error || hint) && (
        <p id={messageId} className={cx('text-sm', error ? 'text-action-red' : 'text-ink-500')} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const controlClass =
  'w-full rounded-control border bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-400 ' +
  'border-ink-200 focus:border-signal-500 disabled:bg-ink-50 disabled:text-ink-500';

export const invalidClass = 'border-alert-500 focus:border-alert-500';
