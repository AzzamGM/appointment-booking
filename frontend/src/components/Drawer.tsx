import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export default function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 sm:hidden">
      <div
        className="fade-in absolute inset-0 bg-stone-950/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="drawer-panel absolute inset-y-0 end-0 flex w-[85%] max-w-sm flex-col border-s border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
          <p className="font-display text-base font-bold">{title}</p>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
