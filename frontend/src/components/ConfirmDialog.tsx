import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { img } from '../lib/images';
import Pic from './Pic';
import { btnGhost, btnPrimaryFlat, card } from '../lib/ui';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  icon?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  busyLabel,
  icon = img.caution,
  tone = 'danger',
  busy = false,
  onConfirm,
  onDismiss,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onDismiss]);

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fade-in absolute inset-0 bg-stone-950/50 backdrop-blur-sm"
        onClick={() => !busy && onDismiss()}
      />

      <div className={`${card} drop relative w-full max-w-sm p-6 text-center`}>
        <Pic src={icon} className="mx-auto h-14 w-14" />
        <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button onClick={onDismiss} disabled={busy} className={btnGhost}>
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={
              tone === 'danger'
                ? 'flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 transition-all hover:bg-rose-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'
                : `flex items-center justify-center gap-2 ${btnPrimaryFlat}`
            }
          >
            {busy ? (
              <>
                <Pic src={img.hourglass} className="hourglass h-5 w-5" />
                {busyLabel ?? confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
