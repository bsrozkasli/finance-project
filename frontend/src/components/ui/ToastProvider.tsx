import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ToastContext, type ToastMessage, type ToastTone } from './toast';

const toneClass: Record<ToastTone, string> = {
  info: 'border-primary/40 text-primary',
  success: 'border-bull-green/40 text-bull-green',
  warning: 'border-yellow-400/40 text-yellow-300',
  error: 'border-bear-red/40 text-bear-red',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Date.now();
    setToasts(current => [{ ...message, id }, ...current].slice(0, 5));
    window.setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-16 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border bg-bg-primary/95 p-3 shadow-xl backdrop-blur ${toneClass[toast.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary">{toast.title}</p>
                {toast.description && <p className="mt-1 text-xs text-text-secondary">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-xs text-text-muted hover:text-text-primary"
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
