import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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

const DISMISS_MS: Record<ToastKind, number> = { success: 4500, info: 4500, error: 7000 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200);
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, kind: ToastKind) => {
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), DISMISS_MS[kind]),
      );
    },
    [dismiss],
  );

  const push = useCallback(
    (kind: ToastKind, message: string, action?: ToastAction) => {
      const id = nextId++;
      setToasts((ts) => [...ts, { id, kind, message, action, leaving: false }]);
      scheduleDismiss(id, kind);
    },
    [scheduleDismiss],
  );

  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const resume = useCallback(
    (id: number, kind: ToastKind) => scheduleDismiss(id, kind),
    [scheduleDismiss],
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
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id, t.kind)}
              className={`toast drop pointer-events-auto flex max-w-full items-start gap-3 rounded-xl border p-3.5 text-white shadow-lg backdrop-blur sm:max-w-md ${style.container}`}
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
              <div className="min-w-0 text-sm font-medium">
                {t.message}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-sm font-semibold transition-colors hover:bg-white/25"
                  >
                    {t.action.label}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
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
