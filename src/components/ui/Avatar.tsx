import { cx } from '@/lib/cx';
import { initials } from '@/lib/format';
/**
 * Displays a user's profile image or, when no image is available,
 * a fallback containing the user's initials.
 * 
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-2xl' };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cx('shrink-0 rounded-control object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx('inline-flex shrink-0 items-center justify-center rounded-control bg-ink-100 font-semibold text-ink-700', sizes[size], className)}
    >
      {initials(name)}
    </span>
  );
}
