import clsx, { type ClassValue } from 'clsx';

/** Single class-name helper so component APIs stay consistent. */
export function cx(...values: ClassValue[]): string {
  return clsx(values);
}
