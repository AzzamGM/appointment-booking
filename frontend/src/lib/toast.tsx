import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  leaving: boolean;
}

interface ToastApi {
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  info: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
  info: () => {},
});

const KIND_STYLE: Record<ToastKind, { container: string; path: ReactNode }> = {
  success: {
    container: 'border-emerald-500 bg-emerald-600/95 dark:border-emerald-400/40 dark:bg-emerald-600/90',
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m8.5 12.5 2.5 2.5 5-5.5" />
      </>
    ),
  },
  error: {
    container: 'border-rose-500 bg-rose-600/95 dark:border-rose-400/40 dark:bg-rose-600/90',
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
  },
  info: {
    container: 'border-teal-500 bg-teal-600/95 dark:border-teal-400/40 dark:bg-teal-600/90',
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    ),
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    // Two-phase removal so the leave transition can play.
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, action?: ToastAction) => {
      const id = nextId++;
      setToasts((ts) => [...ts, { id, kind, message, action, leaving: false }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, a) => push('success', m, a),
      error: (m, a) => push('error', m, a),
      info: (m, a) => push('info', m, a),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-20 z-50 flex flex-col items-center gap-2"
      >
        {toasts.map((t) => {
          const style = KIND_STYLE[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              data-leaving={t.leaving}
              className={`toast drop pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border p-3.5 text-white shadow-lg backdrop-blur ${style.container}`}
            >
              <svg
                className="mt-0.5 shrink-0"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {style.path}
              </svg>
              <div className="flex-1 text-sm font-medium">
                {t.message}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-1 block text-sm font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-white/70 transition-colors hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
