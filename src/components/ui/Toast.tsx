import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, OctagonAlert, X } from 'lucide-react';
import { cx } from '@/lib/cx';

interface ToastMessage {
  id: number;
  tone: 'ok' | 'alert';
  text: string;
}

interface ToastApi {
  confirm(text: string): void;
  problem(text: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const push = useCallback((tone: ToastMessage['tone'], text: string) => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current, { id, tone, text }]);
    setTimeout(() => setMessages((current) => current.filter((message) => message.id !== id)), 6000);
  }, []);

  const value = useMemo<ToastApi>(
    () => ({ confirm: (text) => push('ok', text), problem: (text) => push('alert', text) }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
        {messages.map((message) => (
          <div
            key={message.id}
            role="status"
            aria-live="polite"
            className={cx(
              'pointer-events-auto flex items-start gap-2.5 rounded-card px-4 py-3 text-sm text-white shadow-overlay',
              message.tone === 'ok' ? 'bg-ink-900' : 'bg-alert-600',
            )}
          >
            {message.tone === 'ok' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="flex-1">{message.text}</p>
            <button
              type="button"
              onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}
              aria-label="Dismiss"
              className="rounded p-0.5 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
