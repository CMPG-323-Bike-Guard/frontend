import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

export function ActionsMenu({ label, menuId, children }: { label: string; menuId: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
      triggerRef.current?.focus();
    };

    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    const menuBounds = menuRef.current?.getBoundingClientRect();
    if (!triggerBounds || !menuBounds) return;

    const top = triggerBounds.bottom + menuBounds.height + 8 > window.innerHeight
      ? Math.max(8, triggerBounds.top - menuBounds.height - 4)
      : triggerBounds.bottom + 4;
    const left = Math.max(8, Math.min(triggerBounds.right - menuBounds.width, window.innerWidth - menuBounds.width - 8));
    setPosition((current) => current?.top === top && current.left === left ? current : { top, left });
  }, [open, position]);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-1"
        icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        aria-label={`Actions for ${label}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          if (open) {
            setOpen(false);
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          const menuWidth = 184;
          const menuHeight = 128;
          const top = bounds.bottom + menuHeight + 8 > window.innerHeight
            ? Math.max(8, bounds.top - menuHeight - 4)
            : bounds.bottom + 4;
          const left = Math.max(8, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8));
          setPosition({ top, left });
          setOpen(true);
        }}
      />
      {open && position && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="group"
          aria-label={`Actions for ${label}`}
          style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 50 }}
          className="flex min-w-44 flex-col items-stretch gap-1 rounded-card border border-ink-200 bg-white p-2 shadow-lg"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('button')) setOpen(false);
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}