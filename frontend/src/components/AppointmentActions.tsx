import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../lib/api';
import { useAppointmentCache } from '../lib/appointments';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { img } from '../lib/images';
import Pic from './Pic';
import ConfirmDialog from './ConfirmDialog';
import type { Appointment } from '../types';

type Rating = 'up' | 'down';
const ratingKey = (id: string) => `medibook:rating:${id}`;

export function VisitRating({ appointmentId }: { appointmentId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(
    () => localStorage.getItem(ratingKey(appointmentId)) as Rating | null,
  );

  const rate = (r: Rating) => {
    localStorage.setItem(ratingKey(appointmentId), r);
    setRating(r);
    toast.success(t(r === 'up' ? 'appointments.thanksFeedback' : 'appointments.sorryFeedback'));
  };

  if (rating) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Pic src={rating === 'up' ? img.thumbsUp : img.thumbDown} className="h-6 w-6" />
        {t('appointments.youRated')}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-stone-400 dark:text-stone-500">
        {t('appointments.howWasVisit')}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rate('up');
        }}
        title={t('appointments.goodVisit')}
        className="rounded-lg p-1.5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
      >
        <Pic src={img.thumbsUp} alt={t('appointments.goodVisit')} className="h-6 w-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rate('down');
        }}
        title={t('appointments.notGreat')}
        className="rounded-lg p-1.5 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
      >
        <Pic src={img.thumbDown} alt={t('appointments.notGreat')} className="h-6 w-6" />
      </button>
    </span>
  );
}

export function useCancelAppointment() {
  const { t } = useTranslation();
  const toast = useToast();
  const cache = useAppointmentCache();

  return useMutation({
    mutationFn: (id: string) => api<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: (updated) => {
      cache.write(updated);
      toast.success(t('appointments.cancelled'));
      cache.refresh(updated.id);
    },
    onError: (err) => {
      toast.error(errorMessage(err, t('errors.cancelFailed')));
    },
  });
}

function IconAction({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: string;
  label: string;
  tone: 'neutral' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`group/item relative flex h-10 w-full items-center justify-center rounded-xl transition-colors ${
        tone === 'danger'
          ? 'hover:bg-rose-50 dark:hover:bg-rose-950/50'
          : 'hover:bg-teal-50 dark:hover:bg-teal-500/10'
      }`}
    >
      <Pic src={icon} className="no-tilt h-6 w-6 transition-transform group-hover/item:scale-110" />
      <span className="pointer-events-none absolute end-full top-1/2 me-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100 dark:bg-stone-700">
        {label}
      </span>
    </button>
  );
}

export default function AppointmentActions({
  appointment: a,
  onViewSummary,
  onOpenChange,
}: {
  appointment: Appointment;
  onViewSummary?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cancel = useCancelAppointment();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) toggle(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const cancelling = cancel.isPending && cancel.variables === a.id;
  const canCancel =
    (a.status === 'REQUESTED' || a.status === 'CONFIRMED') && user?.role !== 'DOCTOR';

  if (!onViewSummary && !canCancel) return null;

  return (
    <div ref={ref} className="relative h-10 w-14 shrink-0" onClick={(e) => e.stopPropagation()}>
      <div
        className={`absolute end-0 top-0 flex w-12 flex-col items-center rounded-2xl border transition-colors ${
          open
            ? 'z-30 border-stone-200/80 bg-white/95 shadow-xl ring-1 ring-stone-900/5 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 dark:ring-black/40'
            : 'border-stone-200 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
        }`}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('appointments.actions')}
          title={t('appointments.actions')}
          onClick={() => toggle(!open)}
          className={`flex h-10 w-full shrink-0 items-center justify-center rounded-2xl transition-colors ${
            open ? 'text-teal-700 dark:text-teal-300' : 'text-stone-500 dark:text-stone-400'
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? '' : 'rotate-90'}`}
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="drop flex w-full flex-col items-center gap-1 border-t border-stone-200/70 px-1.5 pb-1.5 pt-1.5 dark:border-stone-700/70"
          >
            {onViewSummary && (
              <IconAction
                icon={img.view}
                label={t('appointments.viewSummary')}
                tone="neutral"
                onClick={() => {
                  toggle(false);
                  onViewSummary();
                }}
              />
            )}
            {canCancel && (
              <IconAction
                icon={img.cancel}
                label={t('appointments.cancel')}
                tone="danger"
                onClick={() => {
                  toggle(false);
                  setConfirming(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title={t('appointments.confirmCancelTitle')}
          message={t('appointments.confirmCancelBody')}
          confirmLabel={t('appointments.confirmCancelYes')}
          cancelLabel={t('appointments.keepIt')}
          busyLabel={t('appointments.cancelling')}
          busy={cancelling}
          onConfirm={() => cancel.mutate(a.id, { onSuccess: () => setConfirming(false) })}
          onDismiss={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
